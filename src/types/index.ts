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

// Character Definition
export interface Character {
  id: string;
  name: string;
  nickname: string; // Random username
  signature?: string; // Personal signature/bio
  nameEn: string;
  mbti: string;
  zodiac: string;
  age: number;
  job: string;
  jobEn: string;
  background: string;
  personality: string;
  speakingStyle: string;
  skills: Skill[];
  pixelAvatar: {
    neutral: string; // SVG data or component
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
