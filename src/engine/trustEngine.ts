import type { ConflictState } from '../types/index';

export type TrustAnalysis = {
  trustDelta: number;
  emotionChange: 'neutral' | 'happy' | 'upset';
  conflictState: ConflictState;
  conflictSummary?: string;
};

const clampTrustDelta = (value: number): number => Math.max(-6, Math.min(6, value));

const hasAny = (text: string, keywords: string[]): boolean => keywords.some((word) => text.includes(word));

const strongInsults = ['滚', '垃圾', '白痴', '废物', '恶心', '傻逼', '去死'];
const mildInsults = ['傻', '蠢', '烦人', '无聊', '讨厌', '没用'];
const dismissiveWords = ['无所谓', '随便', '不在乎', '关我什么事', '懒得', '别烦', '算了', '不想聊', '先这样'];
const nonsenseWords = ['哈哈哈', '啊啊啊', 'asdf', '？？？', '。。。', '随便聊', '不知道说啥'];
const empathyWords = ['我理解', '我能理解', '我能感受', '你的感受', '听起来', '确实不容易'];
const curiosityWords = ['能具体', '告诉我', '为什么', '发生了什么', '愿意说', '可以说说'];
const apologyWords = ['对不起', '抱歉', '不好意思', '我错了', '我刚才', '我不是故意'];
const repairWords = ['让你不舒服', '我说得太急', '我不该', '我收回', '下次我会', '我想重新说'];
const reflectiveRepairWords = ['用了很差的方式', '不知道怎么接', '重新来一次', '重新说', '我想重来'];
const encouragementWords = ['加油', '你可以', '相信你', '辛苦了', '已经做得很好'];
const sharedExperienceWords = ['我也', '我曾经', '我经历过', '我以前'];

/**
 * Calculate a bounded trust delta and conflict state from the user's message.
 *
 * Single-turn changes are intentionally small: -6 to +6, with most ordinary
 * turns landing between -2 and +3. Conflict state carries the immediate
 * emotional feedback, while trust level changes slowly over time.
 */
export const calculateTrustDelta = (
  userMessage: string,
  _aiResponse: string,
  isFirstMessage: boolean
): TrustAnalysis => {
  const lowerMessage = userMessage.toLowerCase().trim();
  const compactMessage = lowerMessage.replace(/\s/g, '');

  if (hasAny(lowerMessage, strongInsults)) {
    return {
      trustDelta: -6,
      emotionChange: 'upset',
      conflictState: 'withdrawn',
      conflictSummary: '用户说了明显攻击或羞辱的话',
    };
  }

  if (
    hasAny(lowerMessage, mildInsults) ||
    (lowerMessage.includes('你') && hasAny(lowerMessage, ['太差', '真烦', '很烦', '没意思', '有病']))
  ) {
    return {
      trustDelta: -4,
      emotionChange: 'upset',
      conflictState: 'hurt',
      conflictSummary: '用户的表达让对方感到被贬低或冒犯',
    };
  }

  if (hasAny(lowerMessage, dismissiveWords)) {
    return {
      trustDelta: -3,
      emotionChange: 'upset',
      conflictState: 'awkward',
      conflictSummary: '用户表现出敷衍、冷淡或不在乎',
    };
  }

  if (!isFirstMessage && (compactMessage.length <= 2 || hasAny(lowerMessage, nonsenseWords))) {
    return {
      trustDelta: -1,
      emotionChange: 'neutral',
      conflictState: 'awkward',
      conflictSummary: '用户没有认真接住当前对话',
    };
  }

  const isApology = hasAny(lowerMessage, apologyWords);
  const isRepair = isApology && hasAny(lowerMessage, repairWords);

  if (isRepair) {
    return {
      trustDelta: 4,
      emotionChange: 'happy',
      conflictState: 'repairing',
      conflictSummary: '用户在承认影响并尝试修复关系',
    };
  }

  if (isApology) {
    return {
      trustDelta: 2,
      emotionChange: 'neutral',
      conflictState: 'repairing',
      conflictSummary: '用户开始道歉，但修复还需要继续',
    };
  }

  if (hasAny(lowerMessage, reflectiveRepairWords)) {
    return {
      trustDelta: 2,
      emotionChange: 'neutral',
      conflictState: 'repairing',
      conflictSummary: '用户在反思刚才的表达，并尝试重新连接',
    };
  }

  if (hasAny(lowerMessage, empathyWords)) {
    return { trustDelta: 4, emotionChange: 'happy', conflictState: 'none' };
  }

  if (hasAny(lowerMessage, curiosityWords) || (lowerMessage.includes('愿意') && lowerMessage.includes('说说'))) {
    return { trustDelta: 3, emotionChange: 'happy', conflictState: 'none' };
  }

  if (hasAny(lowerMessage, encouragementWords)) {
    return { trustDelta: 2, emotionChange: 'happy', conflictState: 'none' };
  }

  if (hasAny(lowerMessage, sharedExperienceWords)) {
    return { trustDelta: 2, emotionChange: 'happy', conflictState: 'none' };
  }

  if (isFirstMessage) {
    return { trustDelta: 1, emotionChange: 'neutral', conflictState: 'none' };
  }

  return { trustDelta: 0, emotionChange: 'neutral', conflictState: 'none' };
};

export const mapSatisfactionToTrustDelta = (satisfactionDelta: number): number => {
  const normalized = Math.max(1, Math.min(5, Math.round(satisfactionDelta)));
  const mapped: Record<number, number> = {
    1: -4,
    2: -2,
    3: 0,
    4: 2,
    5: 4,
  };
  return mapped[normalized] ?? 0;
};

export const combineTrustDeltas = (ruleDelta: number, llmDelta: number): number => {
  return Math.round(clampTrustDelta(ruleDelta * 0.75 + llmDelta * 0.25));
};

/**
 * Analyze message for severe harmful content that should immediately stop the turn.
 */
export const isHarmfulMessage = (message: string): boolean => {
  const harmful = ['去死', '杀了', '杀死', '弄死', '威胁你', '伤害你'];
  const lower = message.toLowerCase();
  return harmful.some((word) => lower.includes(word));
};
