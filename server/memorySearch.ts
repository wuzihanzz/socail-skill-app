import type { MemoryEntry } from './database';

const EMBEDDING_DIMENSIONS = 64;

const tokenize = (text: string): string[] => {
  const lower = text.toLowerCase();
  const latin = lower.match(/[a-z0-9_]+/g) ?? [];
  const cjk = lower.match(/[\u4e00-\u9fff]{1,2}/g) ?? [];
  return [...latin, ...cjk].filter((token) => token.length > 0);
};

const hashToken = (token: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
};

export const buildTextEmbedding = (text: string): number[] => {
  const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);
  for (const token of tokenize(text)) {
    const index = hashToken(token) % EMBEDDING_DIMENSIONS;
    vector[index] += 1;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) return vector;
  return vector.map((value) => Number((value / magnitude).toFixed(6)));
};

const cosineSimilarity = (left: number[] = [], right: number[] = []): number => {
  const length = Math.min(left.length, right.length);
  if (length === 0) return 0;
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let i = 0; i < length; i += 1) {
    dot += left[i] * right[i];
    leftMagnitude += left[i] * left[i];
    rightMagnitude += right[i] * right[i];
  }
  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return dot / Math.sqrt(leftMagnitude * rightMagnitude);
};

const inferQueryTags = (text: string): string[] => {
  const rules: Array<[string, string[]]> = [
    ['work', ['工作', '加班', '项目', '老板', '同事', '简历', '面试']],
    ['family', ['爸', '妈', '父母', '家里', '家庭']],
    ['stress', ['压力', '焦虑', '崩溃', '累', '烦', '难受']],
    ['relationship', ['朋友', '关系', '喜欢', '讨厌', '恋爱', '分手']],
    ['apology', ['对不起', '抱歉', '不是故意', '误会', '道歉']],
    ['preference', ['喜欢', '不喜欢', '希望', '不要', '建议', '偏好']],
  ];

  return rules
    .filter(([, keywords]) => keywords.some((keyword) => text.includes(keyword)))
    .map(([tag]) => tag);
};

export const rankMemoryEntries = (
  entries: MemoryEntry[],
  query: string,
  limit = 6
): MemoryEntry[] => {
  const queryEmbedding = buildTextEmbedding(query);
  const queryTags = inferQueryTags(query);
  const asksForMemory = /记得|记不记得|上次|之前|我说过|我们聊过|刚才/.test(query);
  const now = Date.now();

  return entries
    .map((entry) => {
      const tagHits = entry.tags.filter((tag) => queryTags.includes(tag)).length;
      const similarity = cosineSimilarity(queryEmbedding, entry.embedding);
      const recencyDays = Math.max(0, Math.floor((now - entry.updatedAt) / 86_400_000));
      const recencyBoost = Math.max(0, 7 - recencyDays) * 0.15;
      const textHit = tokenize(query).some((token) => entry.content.toLowerCase().includes(token));
      const score =
        similarity * 8 +
        tagHits * 3 +
        entry.importance * 0.8 +
        recencyBoost +
        (asksForMemory ? 2 : 0) +
        (textHit ? 1.5 : 0);
      return { ...entry, score };
    })
    .filter((entry) => (asksForMemory ? entry.score > 1.2 : entry.score > 2.2))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit);
};
