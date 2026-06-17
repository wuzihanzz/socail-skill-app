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
import { bootstrapAnonymousSession, saveCloudState } from '../lib/accountApi';
import { GUEST_SESSION_KEY, PERSISTENT_ENTRY_KEY } from '../lib/sessionKeys';

const LEGACY_STORAGE_KEY = 'social-skill-game-state';
const ACTIVE_SESSION_KEY = 'social-skill-active-session';
const ACCOUNT_STATE_PREFIX = 'social-skill-account-state:';
const LOCAL_CACHE_KEY = 'social-skill-cloud-cache';

const hasStoredEntryChoice = (): boolean =>
  typeof window !== 'undefined' &&
  (localStorage.getItem(PERSISTENT_ENTRY_KEY) === 'true' ||
    Boolean(sessionStorage.getItem(GUEST_SESSION_KEY)));

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
  isHydrating: boolean;
  hydrationError: string | null;
  storageMode: 'postgres' | 'memory' | null;
  initializeSession: () => Promise<void>;
  enterGuestMode: () => Promise<void>;
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
  resetCharacterRelationship: (characterId: string) => void;
}

export const useGameStore = create<Store>((set) => ({
  session: null,
  userProfile: null,
  currentCharacterId: null,
  relationships: initializeRelationships(),
  conversationHistory: [],
  isHydrating: hasStoredEntryChoice(),
  hydrationError: null,
  storageMode: null,

  initializeSession: async () => {
    set({ isHydrating: true, hydrationError: null });
    try {
      const response = await bootstrapAnonymousSession();
      const session = response.session;
      const remoteState = response.state
        ? normalizeStoredState({ ...response.state, session })
        : null;
      const migratedState = remoteState ?? loadLegacyState(session);
      const initialState =
        migratedState ??
        normalizeStoredState({
          session,
          userProfile: createUserProfile(session.userId, session.displayName),
          currentCharacterId: null,
          relationships: initializeRelationships(),
          conversationHistory: [],
        });

      set({
        ...initialState,
        isHydrating: false,
        hydrationError: null,
        storageMode: response.storage,
      });
      localStorage.setItem(PERSISTENT_ENTRY_KEY, 'true');
      saveToStorage(initialState);
      clearLegacySessionKeys();
    } catch (error) {
      console.error('Failed to initialize server identity:', error);
      set({
        isHydrating: false,
        hydrationError: '暂时无法连接到身份服务，请稍后刷新重试。',
      });
    }
  },

  enterGuestMode: async () => {
    set({ isHydrating: true, hydrationError: null });
    try {
      const response = await bootstrapAnonymousSession();
      const accountSession = response.session;
      const session: UserSession = {
        mode: 'guest',
        userId: accountSession.userId,
        displayName: '游客',
        authProvider: 'guest',
        createdAt: accountSession.createdAt,
      };
      sessionStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
      set({
        session,
        userProfile: null,
        currentCharacterId: null,
        relationships: initializeRelationships(),
        conversationHistory: [],
        isHydrating: false,
        hydrationError: null,
        storageMode: response.storage,
      });
    } catch (error) {
      console.error('Failed to initialize guest identity:', error);
      set({
        isHydrating: false,
        hydrationError: '暂时无法连接到身份服务，请稍后刷新重试。',
      });
    }
  },

  logout: () =>
    set(() => {
      localStorage.removeItem(PERSISTENT_ENTRY_KEY);
      sessionStorage.removeItem(GUEST_SESSION_KEY);
      if (saveTimer) window.clearTimeout(saveTimer);
      saveTimer = undefined;
      pendingState = null;
      return {
        session: null,
        userProfile: null,
        currentCharacterId: null,
        relationships: initializeRelationships(),
        conversationHistory: [],
        isHydrating: false,
        hydrationError: null,
        storageMode: null,
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

let saveTimer: number | undefined;
let pendingState: GameState | null = null;
let saveChain = Promise.resolve();

const saveToStorage = (state: GameState) => {
  if (!state.session || state.session.mode !== 'account') return;
  const snapshot = toGameState(state);
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(snapshot));
  } catch (e) {
    console.error('Failed to save local cache:', e);
  }

  pendingState = snapshot;
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    const nextState = pendingState;
    pendingState = null;
    if (!nextState) return;
    saveChain = saveChain
      .then(() => saveCloudState(nextState))
      .then(() => undefined)
      .catch((error) => {
        console.error('Failed to sync state to server:', error);
      });
  }, 300);
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

const loadLegacyState = (session: UserSession): GameState | null => {
  const candidates: Array<string | null> = [localStorage.getItem(LOCAL_CACHE_KEY)];
  const activeSessionRaw = localStorage.getItem(ACTIVE_SESSION_KEY);
  if (activeSessionRaw) {
    try {
      const activeSession = JSON.parse(activeSessionRaw) as UserSession;
      candidates.push(
        localStorage.getItem(`${ACCOUNT_STATE_PREFIX}${activeSession.userId}`)
      );
    } catch {
      // Ignore malformed legacy sessions.
    }
  }
  candidates.push(localStorage.getItem(LEGACY_STORAGE_KEY));

  for (const stored of candidates) {
    if (!stored) continue;
    try {
      return normalizeStoredState({
        ...(JSON.parse(stored) as GameState),
        session,
      });
    } catch {
      // Try the next legacy format.
    }
  }
  return null;
};

const clearLegacySessionKeys = (): void => {
  localStorage.removeItem(ACTIVE_SESSION_KEY);
  sessionStorage.removeItem(GUEST_SESSION_KEY);
};

const toGameState = (state: GameState): GameState => ({
  session: state.session,
  userProfile: state.userProfile,
  currentCharacterId: state.currentCharacterId,
  relationships: state.relationships,
  conversationHistory: state.conversationHistory,
});

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
