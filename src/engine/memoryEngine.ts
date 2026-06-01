import type {
  MemoryDiaryEntry,
  MemoryDrawer,
  MemoryRoom,
  MemoryRoomType,
  MemoryWing,
} from '../types/index';

const ROOM_LABELS: Record<MemoryRoomType, string> = {
  'user-profile': '用户画像',
  relationship: '关系印象',
  'shared-events': '共同经历',
  conflict: '冲突与修复',
  preferences: '沟通偏好',
  unresolved: '未完成话题',
  milestones: '关系节点',
};

const ROOM_TYPES = Object.keys(ROOM_LABELS) as MemoryRoomType[];
const MAX_DRAWERS_PER_ROOM = 24;
const MAX_DIARY_ENTRIES = 20;

interface MemoryTurnInput {
  characterId: string;
  characterName: string;
  userMessage: string;
  assistantMessages: string[];
  trustDelta: number;
  trustLevel: number;
  emotion: 'neutral' | 'happy' | 'upset';
  todayEvent?: string | null;
}

interface ScoredDrawer {
  drawer: MemoryDrawer;
  roomType: MemoryRoomType;
  score: number;
}

export const createMemoryWing = (
  ownerId: string,
  name: string,
  ownerType: MemoryWing['ownerType'] = 'character'
): MemoryWing => {
  const rooms = ROOM_TYPES.reduce(
    (acc, type) => {
      acc[type] = {
        id: type,
        name: ROOM_LABELS[type],
        type,
        drawers: [],
      };
      return acc;
    },
    {} as Record<MemoryRoomType, MemoryRoom>
  );

  return {
    id: `${ownerType}:${ownerId}`,
    ownerType,
    ownerId,
    name,
    rooms,
    diary: [],
    lastVisitedAt: Date.now(),
  };
};

export const normalizeMemoryWing = (
  wing: MemoryWing | undefined,
  ownerId: string,
  name: string
): MemoryWing => {
  const fallback = createMemoryWing(ownerId, name);
  if (!wing) return fallback;

  const rooms = ROOM_TYPES.reduce(
    (acc, type) => {
      acc[type] = {
        ...fallback.rooms[type],
        ...wing.rooms?.[type],
        drawers: wing.rooms?.[type]?.drawers ?? [],
      };
      return acc;
    },
    {} as Record<MemoryRoomType, MemoryRoom>
  );

  return {
    ...fallback,
    ...wing,
    rooms,
    diary: wing.diary ?? [],
    lastVisitedAt: wing.lastVisitedAt ?? Date.now(),
  };
};

export const updateMemoryFromTurn = (
  wing: MemoryWing,
  input: MemoryTurnInput
): MemoryWing => {
  const now = Date.now();
  const nextWing: MemoryWing = {
    ...wing,
    rooms: Object.fromEntries(
      ROOM_TYPES.map((type) => [
        type,
        {
          ...wing.rooms[type],
          drawers: [...wing.rooms[type].drawers],
        },
      ])
    ) as Record<MemoryRoomType, MemoryRoom>,
    diary: [...wing.diary],
    lastVisitedAt: now,
  };

  const drawers = extractDrawers(input, now);
  drawers.forEach(({ roomType, drawer }) => {
    addDrawer(nextWing.rooms[roomType], drawer);
  });

  const diaryEntry = buildDiaryEntry(input, now);
  if (diaryEntry) {
    nextWing.diary = [diaryEntry, ...nextWing.diary].slice(0, MAX_DIARY_ENTRIES);
  }

  return nextWing;
};

export const buildMemoryContext = (
  wing: MemoryWing | undefined,
  userMessage: string,
  emotion: 'neutral' | 'happy' | 'upset',
  limit = 8
): string => {
  if (!wing) return '';

  const scored = ROOM_TYPES.flatMap((roomType) =>
    wing.rooms[roomType].drawers.map((drawer) => ({
      drawer,
      roomType,
      score: scoreDrawer(drawer, roomType, userMessage, emotion),
    }))
  )
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (scored.length === 0) return '';

  const grouped = groupByRoom(scored);
  return Object.entries(grouped)
    .map(([roomType, items]) => {
      const lines = items.map(({ drawer }) => `- ${drawer.content}`).join('\n');
      return `### ${ROOM_LABELS[roomType as MemoryRoomType]}\n${lines}`;
    })
    .join('\n');
};

const extractDrawers = (
  input: MemoryTurnInput,
  now: number
): Array<{ roomType: MemoryRoomType; drawer: MemoryDrawer }> => {
  const results: Array<{ roomType: MemoryRoomType; drawer: MemoryDrawer }> = [];
  const userText = input.userMessage.trim();
  const assistantText = input.assistantMessages.join(' ').trim();
  const tags = inferTags(`${userText} ${assistantText}`);

  if (looksLikeUserFact(userText)) {
    results.push({
      roomType: 'user-profile',
      drawer: createDrawer({
        content: `用户曾说：${quote(userText)}`,
        speaker: 'user',
        importance: 4,
        emotionalTone: 'neutral',
        tags,
        now,
      }),
    });
  }

  if (looksLikePreference(userText)) {
    results.push({
      roomType: 'preferences',
      drawer: createDrawer({
        content: `用户表达过偏好：${quote(userText)}`,
        speaker: 'user',
        importance: 3,
        emotionalTone: 'neutral',
        tags,
        now,
      }),
    });
  }

  if (input.trustDelta >= 4) {
    results.push({
      roomType: 'relationship',
      drawer: createDrawer({
        content: `这次互动让${input.characterName}更愿意亲近用户：用户说${quote(userText)}`,
        speaker: 'user',
        importance: 4,
        emotionalTone: 'positive',
        tags: [...tags, 'trust-up'],
        now,
      }),
    });
  }

  if (input.trustDelta <= -4 || input.emotion === 'upset') {
    results.push({
      roomType: 'conflict',
      drawer: createDrawer({
        content: `这次互动让${input.characterName}不太舒服：用户说${quote(userText)}`,
        speaker: 'user',
        importance: 5,
        emotionalTone: 'tense',
        tags: [...tags, 'conflict'],
        now,
      }),
    });
  }

  if (looksLikeRepair(userText)) {
    results.push({
      roomType: 'conflict',
      drawer: createDrawer({
        content: `用户尝试修复关系或解释自己：${quote(userText)}`,
        speaker: 'user',
        importance: 4,
        emotionalTone: 'repaired',
        tags: [...tags, 'repair'],
        now,
      }),
    });
  }

  if (assistantText.length > 0 && (input.todayEvent || input.trustDelta !== 0)) {
    results.push({
      roomType: 'shared-events',
      drawer: createDrawer({
        content: `两人聊到：用户${quote(userText)}，${input.characterName}回应${quote(assistantText)}`,
        speaker: 'assistant',
        importance: input.todayEvent ? 4 : 3,
        emotionalTone: input.trustDelta > 0 ? 'positive' : input.trustDelta < 0 ? 'negative' : 'neutral',
        tags,
        now,
      }),
    });
  }

  if (looksUnresolved(userText, assistantText)) {
    results.push({
      roomType: 'unresolved',
      drawer: createDrawer({
        content: `这个话题还可以继续追问：${quote(userText || assistantText)}`,
        speaker: 'assistant',
        importance: 3,
        emotionalTone: 'neutral',
        tags: [...tags, 'unresolved'],
        now,
      }),
    });
  }

  return results;
};

const createDrawer = ({
  content,
  speaker,
  importance,
  emotionalTone,
  tags,
  now,
}: {
  content: string;
  speaker?: 'user' | 'assistant';
  importance: MemoryDrawer['importance'];
  emotionalTone: MemoryDrawer['emotionalTone'];
  tags: string[];
  now: number;
}): MemoryDrawer => ({
  id: `mem_${now}_${Math.random().toString(36).slice(2, 8)}`,
  content,
  speaker,
  source: 'conversation',
  importance,
  emotionalTone,
  tags: Array.from(new Set(tags)).slice(0, 8),
  createdAt: now,
  updatedAt: now,
});

const addDrawer = (room: MemoryRoom, drawer: MemoryDrawer) => {
  const exists = room.drawers.some((item) => item.content === drawer.content);
  if (exists) return;

  room.drawers = [drawer, ...room.drawers]
    .sort((a, b) => b.importance - a.importance || b.createdAt - a.createdAt)
    .slice(0, MAX_DRAWERS_PER_ROOM);
};

const buildDiaryEntry = (
  input: MemoryTurnInput,
  now: number
): MemoryDiaryEntry | null => {
  if (Math.abs(input.trustDelta) < 3 && !looksLikeRepair(input.userMessage)) {
    return null;
  }

  const direction = input.trustDelta > 0 ? '更亲近' : input.trustDelta < 0 ? '更疏远' : '关系有变化';
  return {
    id: `diary_${now}`,
    content: `${input.characterName}和用户的一次互动让关系${direction}。用户说${quote(input.userMessage)}`,
    createdAt: now,
    trustLevel: input.trustLevel,
    emotion: input.emotion,
  };
};

const scoreDrawer = (
  drawer: MemoryDrawer,
  roomType: MemoryRoomType,
  userMessage: string,
  emotion: 'neutral' | 'happy' | 'upset'
): number => {
  const currentTags = inferTags(userMessage);
  const tagHits = drawer.tags.filter((tag) => currentTags.includes(tag)).length;
  const asksForMemory = /(还记得|记不记得|上次|之前|我说过|我们聊过|刚才)/.test(userMessage);
  const recency = Math.max(0, 7 - daysSince(drawer.createdAt));
  const recentlyMentionedPenalty =
    drawer.lastMentionedAt && Date.now() - drawer.lastMentionedAt < 10 * 60 * 1000 ? 4 : 0;

  if (tagHits === 0 && !asksForMemory) {
    if (emotion === 'upset' && (roomType === 'conflict' || roomType === 'unresolved')) {
      return drawer.importance + recency * 0.3;
    }
    return 0;
  }

  let score = drawer.importance + tagHits * 7 + recency * 0.3 - recentlyMentionedPenalty;
  if (asksForMemory) score += 4;
  if (emotion === 'upset' && (roomType === 'conflict' || roomType === 'unresolved')) score += 5;
  if (roomType === 'user-profile' && tagHits > 0) score += 2;
  if (roomType === 'relationship') score += 1;
  return score;
};

const groupByRoom = (items: ScoredDrawer[]) =>
  items.reduce(
    (acc, item) => {
      const roomItems = acc[item.roomType] ?? [];
      roomItems.push(item);
      acc[item.roomType] = roomItems;
      return acc;
    },
    {} as Partial<Record<MemoryRoomType, ScoredDrawer[]>>
  );

const inferTags = (text: string): string[] => {
  const pairs: Array<[string, string[]]> = [
    ['work', ['工作', '加班', '项目', '案子', '客户', '老板', '同事']],
    ['family', ['父母', '妈妈', '爸爸', '家庭', '家里']],
    ['stress', ['压力', '累', '焦虑', '崩溃', '烦']],
    ['relationship', ['朋友', '关系', '喜欢', '讨厌', '分手', '恋爱']],
    ['apology', ['对不起', '抱歉', '不是故意', '误会']],
    ['preference', ['喜欢', '不喜欢', '希望', '别', '不要']],
  ];

  return pairs
    .filter(([, keywords]) => keywords.some((keyword) => text.includes(keyword)))
    .map(([tag]) => tag);
};

const looksLikeUserFact = (text: string) =>
  /(我是|我在|我最近|我之前|我以前|我的|我家|我工作|我喜欢|我讨厌|我不喜欢|我希望)/.test(text);

const looksLikePreference = (text: string) =>
  /(我喜欢|我不喜欢|我讨厌|我希望|别|不要|可以直接|慢一点|温柔一点)/.test(text);

const looksLikeRepair = (text: string) =>
  /(对不起|抱歉|不好意思|不是故意|我不是那个意思|我刚才说重了|我道歉)/.test(text);

const looksUnresolved = (userText: string, assistantText: string) =>
  /(\?|？|以后再说|下次|有机会|不想说|算了|没事)/.test(`${userText} ${assistantText}`);

const quote = (text: string) => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return `“${normalized.slice(0, 80)}${normalized.length > 80 ? '...' : ''}”`;
};

const daysSince = (timestamp: number) =>
  Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));
