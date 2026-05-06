import { create } from 'zustand';
import type { GameState, RelationshipState, Message } from '../types/index';
import characters from '../data/characters';

const STORAGE_KEY = 'social-skill-game-state';

// Initialize relationships for all characters
const initializeRelationships = (): Record<string, RelationshipState> => {
  const relationships: Record<string, RelationshipState> = {};

  characters.forEach((char) => {
    relationships[char.id] = {
      characterId: char.id,
      trustLevel: 25, // Start with some baseline
      satisfactionLevel: 50,
      currentEmotion: 'neutral',
      unlockedSkills: char.skills
        .filter((s) => s.alwaysVisible)
        .map((s) => s.id),
      conversationHistory: [],
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
  setCurrentCharacter: (characterId: string) => void;
  addMessage: (characterId: string, message: Message) => void;
  updateTrustLevel: (
    characterId: string,
    delta: number,
    emotion?: 'neutral' | 'happy' | 'upset'
  ) => void;
  unlockSkill: (characterId: string, skillId: string) => void;
  setTodayEventTriggered: (characterId: string, triggered: boolean) => void;
  setFirstMessageSent: (characterId: string, sent: boolean) => void;
  updateUserNotes: (characterId: string, notes: string) => void;
  markAskedAbout: (
    characterId: string,
    field: 'name' | 'age' | 'job' | 'mbti' | 'zodiac'
  ) => void;
  loadFromStorage: () => void;
  resetCharacterRelationship: (characterId: string) => void;
}

export const useGameStore = create<Store>((set, get) => ({
  currentCharacterId: null,
  relationships: initializeRelationships(),
  conversationHistory: [],

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
    emotion?: 'neutral' | 'happy' | 'upset'
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
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const state = JSON.parse(stored);
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
          unlockedSkills: character.skills
            .filter((s) => s.alwaysVisible)
            .map((s) => s.id),
          conversationHistory: [],
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save to storage:', e);
  }
};

// Load from storage on app start
useGameStore.getState().loadFromStorage();
