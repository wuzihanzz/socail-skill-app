// Character Skill Definition
export interface Skill {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  eventPool: string[];
  alwaysVisible?: boolean;
  unlocksAt: {
    trustThreshold: number;
    requiresQuestion?: boolean;
    triggerTopics?: string[];
  };
}

// Family background influencing personality
export interface FamilyBackground {
  wealth: 'poor' | 'working-class' | 'middle-class' | 'wealthy' | 'rich';
  parentalAttitude: 'warm' | 'strict' | 'absent' | 'controlling' | 'supportive';
  growthEnvironment: 'rural' | 'small-town' | 'suburban' | 'urban';
  siblingCount: number; // 0 = only child
  keyFormativeEvent?: string; // one sentence, shapes core wound or strength
}

// What venues/scenes a character will naturally appear in
export interface VenuePreferences {
  frequents: VenueType[];   // places they go regularly
  avoids: VenueType[];      // places they won't go
  reason?: string;          // brief note on why
}

export type VenueType =
  | 'bar'
  | 'cafe'
  | 'restaurant'
  | 'gym'
  | 'park'
  | 'bookstore'
  | 'art-gallery'
  | 'club'
  | 'library'
  | 'office-pantry';

// Derived social tendencies (computed from family + personality, stored for prompt use)
export interface SocialTendency {
  extroversion: 1 | 2 | 3 | 4 | 5; // 1=very introverted, 5=very extroverted
  trustsEasily: boolean;
  conflictStyle: 'avoids' | 'confronts' | 'deflects';
  attachmentStyle: 'secure' | 'anxious' | 'avoidant';
  drinkingHabit: 'never' | 'rarely' | 'socially' | 'regularly';
}

// Character Definition
export interface Character {
  id: string;
  name: string;
  nickname: string;
  signature?: string;
  nameEn: string;
  mbti: string;
  zodiac: string;
  age: number;
  job: string;
  jobEn: string;
  background: string;
  personality: string;
  speakingStyle: string;
  familyBackground: FamilyBackground;
  venuePreferences: VenuePreferences;
  socialTendency: SocialTendency;
  skills: Skill[];
  pixelAvatar: {
    neutral: string;
    happy: string;
    upset: string;
  };
  initialEmotion: 'neutral' | 'happy' | 'upset';
  dailyEventPool: string[];
}

// User-Character Relationship
export interface RelationshipState {
  characterId: string;
  trustLevel: number; // 0-100
  satisfactionLevel: number; // 0-100
  currentEmotion: 'neutral' | 'happy' | 'upset';
  unlockedSkills: string[]; // skill IDs
  conversationHistory: Message[];
  memoryWing: MemoryWing;
  lastDailyEvent: string;
  todayEventTriggered: boolean;
  firstMessageSent: boolean;
  userNotes: string; // User's personal notes about the character
  askedAbout: {
    name: boolean;
    age: boolean;
    job: boolean;
    mbti: boolean;
    zodiac: boolean;
  };
}

// Memory palace: one wing per character/bot, rooms by relationship topic.
export interface MemoryWing {
  id: string;
  ownerType: 'character' | 'system' | 'future-bot';
  ownerId: string;
  name: string;
  rooms: Record<MemoryRoomType, MemoryRoom>;
  diary: MemoryDiaryEntry[];
  lastVisitedAt: number;
}

export type MemoryRoomType =
  | 'user-profile'
  | 'relationship'
  | 'shared-events'
  | 'conflict'
  | 'preferences'
  | 'unresolved'
  | 'milestones';

export interface MemoryRoom {
  id: MemoryRoomType;
  name: string;
  type: MemoryRoomType;
  drawers: MemoryDrawer[];
}

export interface MemoryDrawer {
  id: string;
  content: string;
  speaker?: 'user' | 'assistant';
  source: 'conversation' | 'system' | 'manual';
  importance: 1 | 2 | 3 | 4 | 5;
  emotionalTone?: 'positive' | 'neutral' | 'negative' | 'tense' | 'repaired';
  tags: string[];
  createdAt: number;
  updatedAt: number;
  lastAccessedAt?: number;
  lastMentionedAt?: number;
}

export interface MemoryDiaryEntry {
  id: string;
  content: string;
  createdAt: number;
  trustLevel: number;
  emotion: 'neutral' | 'happy' | 'upset';
}

// Message
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  trustDelta?: number; // change in trust after this message
}

// Social Tip
export interface Tip {
  id: string;
  category: string;
  title: string;
  description: string;
  example: string;
  icon: string;
}

// Game State
export interface GameState {
  currentCharacterId: string | null;
  relationships: Record<string, RelationshipState>;
  conversationHistory: Message[];
}
