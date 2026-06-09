import { create } from 'zustand';
import type {
  ConflictState,
  GameState,
  Message,
  ProfileFactType,
  RelationshipState,
  UserProfile,
  UserSession,
} from '../types/index';
import characters from '../data/characters';
import { createMemoryWing, normalizeMemoryWing } from '../engine/memoryEngine';
import {
  confirmProfileFact,
  createUserProfile,
  deleteProfileFact,
  extractProfileFactsFromMessage,
  mergeProfileFacts,
  upsertManualProfileFact,
} from '../engine/userProfileEngine';

const LEGACY_STORAGE_KEY = 'social-skill-game-state';
const ACTIVE_SESSION_KEY = 'social-skill-active-session';
const GUEST_SESSION_KEY = 'social-skill-guest-session';
const ACCOUNT_STATE_PREFIX = 'social-skill-account-state:';

const getAccountStateKey = (userId: string): string => `${ACCOUNT_STATE_PREFIX}${userId}`;

// Initialize relationships for all characters
const initializeRelationships = (): Record<string, RelationshipState> => {
  const relationships: Record<string, RelationshipState> = {};

  characters.forEach((char) => {
    relationships[char.id] = {
      characterId: char.id,
      trustLevel: 25, // Start with some baseline
      satisfactionLevel: 50,
      currentEmotion: 'neutral',
      conflictState: 'none',
      repairAttempts: 0,
      conflictTurns: 0,
      achievedMilestones: [10, 20],
      unlockedSkills: char.skills
        .filter((s) => s.alwaysVisible)
        .map((s) => s.id),
      conversationHistory: [],
      memoryWing: createMemoryWing(char.id, char.nickname),
      lastDailyEvent: new Date().toISOString().split('T')[0],
      todayEventTriggered: false,
      firstMessageSent: false,
      userNotes: '',
      askedAbout: {
        name: false,
        age: false,
        job: false,
        mbti: false,
        zodiac: false,
      },
    };
  });

  return relationships;
};

interface Store extends GameState {
  loginWithAuthenticatedUser: (userId: string, email: string, displayName?: string) => void;
  enterGuestMode: () => void;
  logout: () => void;
  setCurrentCharacter: (characterId: string) => void;
  addMessage: (characterId: string, message: Message) => void;
  updateTrustLevel: (
    characterId: string,
    delta: number,
    emotion?: 'neutral' | 'happy' | 'upset',
    conflictState?: ConflictState,
    conflictSummary?: string
  ) => void;
  markTrustMilestones: (characterId: string, milestones: number[]) => void;
  unlockSkill: (characterId: string, skillId: string) => void;
  setTodayEventTriggered: (characterId: string, triggered: boolean) => void;
  setFirstMessageSent: (characterId: string, sent: boolean) => void;
  updateUserNotes: (characterId: string, notes: string) => void;
  updateMemoryWing: (
    characterId: string,
    updater: (relationship: RelationshipState) => RelationshipState['memoryWing']
  ) => void;
  extractUserProfileFromMessage: (userMessage: string) => void;
  upsertUserProfileFact: (type: ProfileFactType, value: string, existingId?: string) => void;
  deleteUserProfileFact: (factId: string) => void;
  confirmUserProfileFact: (factId: string) => void;
  markAskedAbout: (
    characterId: string,
    field: 'name' | 'age' | 'job' | 'mbti' | 'zodiac'
  ) => void;
  loadFromStorage: () => void;
  resetCharacterRelationship: (characterId: string) => void;
}

export const useGameStore = create<Store>((set) => ({
  session: null,
  userProfile: null,
  currentCharacterId: null,
  relationships: initializeRelationships(),
  conversationHistory: [],

  loginWithAuthenticatedUser: (userId: string, email: string, displayName?: string) =>
    set(() => {
      sessionStorage.removeItem(GUEST_SESSION_KEY);
      const now = Date.now();
      const cleanName = displayName?.trim() || email.split('@')[0] || '练习者';
      const session: UserSession = {
        mode: 'account',
        userId,
        displayName: cleanName,
        email,
        authProvider: 'supabase',
        createdAt: now,
      };
      const existingState = loadAccountState(session);
      if (existingState) {
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(existingState.session));
        return existingState;
      }
      const newState: GameState = {
        session,
        userProfile: createUserProfile(userId, cleanName),
        currentCharacterId: null,
        relationships: initializeRelationships(),
        conversationHistory: [],
      };
      saveToStorage(newState);
      return newState;
    }),

  enterGuestMode: () =>
    set(() => {
      const session: UserSession = {
        mode: 'guest',
        userId: `guest_${Date.now()}`,
        displayName: '游客',
        createdAt: Date.now(),
      };
      sessionStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
      return {
        session,
        userProfile: null,
        currentCharacterId: null,
        relationships: initializeRelationships(),
        conversationHistory: [],
      };
    }),

  logout: () =>
    set(() => {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      sessionStorage.removeItem(GUEST_SESSION_KEY);
      return {
        session: null,
        userProfile: null,
        currentCharacterId: null,
        relationships: initializeRelationships(),
        conversationHistory: [],
      };
    }),

  setCurrentCharacter: (characterId: string) =>
    set((state) => {
      const newState = {
        ...state,
        currentCharacterId: characterId,
        conversationHistory: state.relationships[characterId]
          ?.conversationHistory || [],
      };
      saveToStorage(newState);
      return newState;
    }),

  addMessage: (characterId: string, message: Message) =>
    set((state) => {
      const newRelationships = { ...state.relationships };
      if (newRelationships[characterId]) {
        newRelationships[characterId].conversationHistory.push(message);
      }

      const newState = {
        ...state,
        relationships: newRelationships,
        conversationHistory: newRelationships[characterId]?.conversationHistory,
      };
      saveToStorage(newState);
      return newState;
    }),

  updateTrustLevel: (
    characterId: string,
    delta: number,
    emotion?: 'neutral' | 'happy' | 'upset',
    conflictState?: ConflictState,
    conflictSummary?: string
  ) =>
    set((state) => {
      const newRelationships = { ...state.relationships };
      if (newRelationships[characterId]) {
        const relationship = newRelationships[characterId];
        relationship.trustLevel = Math.max(
          0,
          Math.min(100, relationship.trustLevel + delta)
        );

        // Update satisfaction level based on trust delta and emotion
        // Positive interactions increase satisfaction, negative ones decrease it
        let satisfactionDelta = 0;
        if (delta > 0) {
          // Positive interaction - increase satisfaction
          satisfactionDelta = delta * 0.8; // Satisfaction changes slightly less than trust
        } else if (delta < 0) {
          // Negative interaction - decrease satisfaction
          satisfactionDelta = delta * 1.2; // Negative impacts satisfaction more
        }

        relationship.satisfactionLevel = Math.max(
          0,
          Math.min(100, relationship.satisfactionLevel + satisfactionDelta)
        );

        if (emotion) {
          relationship.currentEmotion = emotion;
        }

        if (conflictState) {
          relationship.conflictState = deriveConflictState(relationship, conflictState, delta);

          if (delta < 0 && conflictState !== 'none' && conflictState !== 'repairing') {
            relationship.conflictTurns += 1;
            relationship.repairAttempts = 0;
          } else if (conflictState === 'repairing' && relationship.conflictState !== 'none') {
            relationship.repairAttempts += 1;
          } else if (relationship.conflictState === 'none') {
            relationship.conflictTurns = 0;
            relationship.repairAttempts = 0;
          }

          if (conflictSummary) {
            relationship.lastConflictSummary = conflictSummary;
          } else if (relationship.conflictState === 'none') {
            relationship.lastConflictSummary = undefined;
          }
        }
      }

      const newState = {
        ...state,
        relationships: newRelationships,
      };
      saveToStorage(newState);
      return newState;
    }),

  markTrustMilestones: (characterId: string, milestones: number[]) =>
    set((state) => {
      if (milestones.length === 0) return state;

      const newRelationships = { ...state.relationships };
      const relationship = newRelationships[characterId];
      if (relationship) {
        const achieved = new Set(relationship.achievedMilestones ?? []);
        milestones.forEach((milestone) => achieved.add(milestone));
        newRelationships[characterId] = {
          ...relationship,
          achievedMilestones: [...achieved].sort((a, b) => a - b),
        };
      }

      const newState = {
        ...state,
        relationships: newRelationships,
      };
      saveToStorage(newState);
      return newState;
    }),

  unlockSkill: (characterId: string, skillId: string) =>
    set((state) => {
      const newRelationships = { ...state.relationships };
      if (
        newRelationships[characterId] &&
        !newRelationships[characterId].unlockedSkills.includes(skillId)
      ) {
        newRelationships[characterId].unlockedSkills.push(skillId);
      }

      const newState = {
        ...state,
        relationships: newRelationships,
      };
      saveToStorage(newState);
      return newState;
    }),

  setTodayEventTriggered: (characterId: string, triggered: boolean) =>
    set((state) => {
      const newRelationships = { ...state.relationships };
      if (newRelationships[characterId]) {
        newRelationships[characterId].todayEventTriggered = triggered;
      }

      const newState = {
        ...state,
        relationships: newRelationships,
      };
      saveToStorage(newState);
      return newState;
    }),

  setFirstMessageSent: (characterId: string, sent: boolean) =>
    set((state) => {
      const newRelationships = { ...state.relationships };
      if (newRelationships[characterId]) {
        newRelationships[characterId].firstMessageSent = sent;
      }

      const newState = {
        ...state,
        relationships: newRelationships,
      };
      saveToStorage(newState);
      return newState;
    }),

  updateUserNotes: (characterId: string, notes: string) =>
    set((state) => {
      const newRelationships = { ...state.relationships };
      if (newRelationships[characterId]) {
        newRelationships[characterId].userNotes = notes;
      }

      const newState = {
        ...state,
        relationships: newRelationships,
      };
      saveToStorage(newState);
      return newState;
    }),

  updateMemoryWing: (
    characterId: string,
    updater: (relationship: RelationshipState) => RelationshipState['memoryWing']
  ) =>
    set((state) => {
      const newRelationships = { ...state.relationships };
      const relationship = newRelationships[characterId];
      if (relationship) {
        newRelationships[characterId] = {
          ...relationship,
          memoryWing: updater(relationship),
        };
      }

      const newState = {
        ...state,
        relationships: newRelationships,
      };
      saveToStorage(newState);
      return newState;
    }),

  extractUserProfileFromMessage: (userMessage: string) =>
    set((state) => {
      if (state.session?.mode !== 'account' || !state.userProfile) return state;
      const extractedFacts = extractProfileFactsFromMessage(state.session.userId, userMessage);
      if (extractedFacts.length === 0) return state;
      const newState = {
        ...state,
        userProfile: mergeProfileFacts(state.userProfile, extractedFacts),
      };
      saveToStorage(newState);
      return newState;
    }),

  upsertUserProfileFact: (type: ProfileFactType, value: string, existingId?: string) =>
    set((state) => {
      if (state.session?.mode !== 'account' || !state.userProfile) return state;
      const newState = {
        ...state,
        userProfile: upsertManualProfileFact(state.userProfile, type, value, existingId),
      };
      saveToStorage(newState);
      return newState;
    }),

  deleteUserProfileFact: (factId: string) =>
    set((state) => {
      if (state.session?.mode !== 'account' || !state.userProfile) return state;
      const newState = {
        ...state,
        userProfile: deleteProfileFact(state.userProfile, factId),
      };
      saveToStorage(newState);
      return newState;
    }),

  confirmUserProfileFact: (factId: string) =>
    set((state) => {
      if (state.session?.mode !== 'account' || !state.userProfile) return state;
      const newState = {
        ...state,
        userProfile: confirmProfileFact(state.userProfile, factId),
      };
      saveToStorage(newState);
      return newState;
    }),

  markAskedAbout: (
    characterId: string,
    field: 'name' | 'age' | 'job' | 'mbti' | 'zodiac'
  ) =>
    set((state) => {
      const newRelationships = { ...state.relationships };
      if (newRelationships[characterId]) {
        newRelationships[characterId].askedAbout[field] = true;
      }

      const newState = {
        ...state,
        relationships: newRelationships,
      };
      saveToStorage(newState);
      return newState;
    }),

  loadFromStorage: () => {
    const activeSession = readStoredSession();
    if (activeSession) {
      const accountState = loadAccountState(activeSession);
      if (accountState) {
        set(accountState);
        return;
      }
    }

    const guestSession = readGuestSession();
    if (guestSession) {
      set({
        session: guestSession,
        userProfile: null,
        currentCharacterId: null,
        relationships: initializeRelationships(),
        conversationHistory: [],
      });
      return;
    }

    const legacyStored = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyStored) {
      try {
        const parsed = JSON.parse(legacyStored) as GameState;
        const state = normalizeStoredState(parsed);
        if (state.session?.mode === 'account') {
          saveToStorage(state);
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
        set(state);
      } catch (e) {
        console.error('Failed to load from storage:', e);
      }
    }
  },

  resetCharacterRelationship: (characterId: string) =>
    set((state) => {
      const character = characters.find((c) => c.id === characterId);
      const newRelationships = { ...state.relationships };

      if (character) {
        newRelationships[characterId] = {
          characterId: characterId,
          trustLevel: 25,
          satisfactionLevel: 50,
          currentEmotion: 'neutral',
          conflictState: 'none',
          repairAttempts: 0,
          conflictTurns: 0,
          achievedMilestones: [10, 20],
          unlockedSkills: character.skills
            .filter((s) => s.alwaysVisible)
            .map((s) => s.id),
          conversationHistory: [],
          memoryWing: createMemoryWing(character.id, character.nickname),
          lastDailyEvent: new Date().toISOString().split('T')[0],
          todayEventTriggered: false,
          firstMessageSent: false,
          userNotes: '',
          askedAbout: {
            name: false,
            age: false,
            job: false,
            mbti: false,
            zodiac: false,
          },
        };
      }

      const newState = {
        ...state,
        relationships: newRelationships,
      };
      saveToStorage(newState);
      return newState;
    }),
}));

// Helper function to save to localStorage
const saveToStorage = (state: GameState) => {
  if (state.session?.mode !== 'account') return;
  try {
    localStorage.setItem(getAccountStateKey(state.session.userId), JSON.stringify(state));
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(state.session));
  } catch (e) {
    console.error('Failed to save to storage:', e);
  }
};

const normalizeStoredState = (state: GameState): GameState => {
  const defaults = initializeRelationships();
  const relationships = { ...defaults, ...(state.relationships ?? {}) };

  characters.forEach((character) => {
    const relationship = relationships[character.id] ?? defaults[character.id];
    relationships[character.id] = {
      ...defaults[character.id],
      ...relationship,
      askedAbout: {
        ...defaults[character.id].askedAbout,
        ...relationship.askedAbout,
      },
      conversationHistory: relationship.conversationHistory ?? [],
      unlockedSkills: relationship.unlockedSkills ?? defaults[character.id].unlockedSkills,
      memoryWing: normalizeMemoryWing(
        relationship.memoryWing,
        character.id,
        character.nickname
      ),
          conflictState: relationship.conflictState ?? defaults[character.id].conflictState,
          lastConflictSummary: relationship.lastConflictSummary,
          repairAttempts: relationship.repairAttempts ?? 0,
          conflictTurns: relationship.conflictTurns ?? 0,
          achievedMilestones:
            relationship.achievedMilestones ??
            defaults[character.id].achievedMilestones,
        };
      });

  return {
    ...state,
    session: state.session ?? null,
    userProfile: normalizeUserProfile(state.userProfile, state.session),
    relationships,
    conversationHistory:
      state.currentCharacterId && relationships[state.currentCharacterId]
        ? relationships[state.currentCharacterId].conversationHistory
        : state.conversationHistory ?? [],
  };
};

const readGuestSession = (): UserSession | null => {
  const stored = sessionStorage.getItem(GUEST_SESSION_KEY);
  if (!stored) return null;
  try {
    const session = JSON.parse(stored) as UserSession;
    return session.mode === 'guest' ? session : null;
  } catch {
    sessionStorage.removeItem(GUEST_SESSION_KEY);
    return null;
  }
};

const readStoredSession = (): UserSession | null => {
  const stored = localStorage.getItem(ACTIVE_SESSION_KEY);
  if (!stored) return null;
  try {
    const session = JSON.parse(stored) as UserSession;
    return session.mode === 'account' && session.userId ? session : null;
  } catch {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    return null;
  }
};

const loadAccountState = (session: UserSession): GameState | null => {
  const stored = localStorage.getItem(getAccountStateKey(session.userId));
  if (!stored) return null;
  try {
    const state = normalizeStoredState(JSON.parse(stored) as GameState);
    return {
      ...state,
      session: {
        ...session,
        createdAt: state.session?.createdAt ?? session.createdAt,
      },
    };
  } catch (error) {
    console.error('Failed to load account state:', error);
    return null;
  }
};

const normalizeUserProfile = (
  profile: UserProfile | null | undefined,
  session: UserSession | null | undefined
): UserProfile | null => {
  if (!session || session.mode !== 'account') return null;
  return {
    ...(profile ?? createUserProfile(session.userId, session.displayName)),
    userId: session.userId,
    facts: profile?.facts ?? createUserProfile(session.userId, session.displayName).facts,
    updatedAt: profile?.updatedAt ?? Date.now(),
  };
};

const deriveConflictState = (
  relationship: RelationshipState,
  nextConflictState: ConflictState,
  delta: number
): ConflictState => {
  if (nextConflictState !== 'repairing') return nextConflictState;

  if (relationship.conflictState === 'none') return 'none';
  const requiredRepairTurns = relationship.conflictTurns >= 2 ? 2 : 1;
  if (relationship.repairAttempts >= requiredRepairTurns && delta > 1) return 'none';
  return 'repairing';
};

// Load from storage on app start
useGameStore.getState().loadFromStorage();
