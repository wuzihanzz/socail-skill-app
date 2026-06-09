import type { ProfileFact, ProfileFactType, UserProfile } from '../types/index';

const MAX_PROFILE_FACTS = 24;

const factLabels: Record<ProfileFactType, string> = {
  displayName: '名字',
  gender: '性别',
  preferredAddress: '希望的称呼',
  hobby: '爱好',
  occupationOrStudy: '职业/学习',
  communicationPreference: '沟通偏好',
  sensitiveBoundary: '雷区',
};

export const createUserProfile = (userId: string, displayName?: string): UserProfile => {
  const now = Date.now();
  const facts: ProfileFact[] = displayName
    ? [
        {
          id: `profile_${now}_name`,
          type: 'displayName',
          value: displayName,
          confidence: 1,
          source: 'manual',
          userConfirmed: true,
          updatedAt: now,
        },
      ]
    : [];

  return {
    userId,
    facts,
    updatedAt: now,
  };
};

export const getProfileFactLabel = (type: ProfileFactType): string => factLabels[type];

export const buildUserProfileSummary = (profile: UserProfile | null, limit = 10): string => {
  if (!profile || profile.facts.length === 0) return '';

  return profile.facts
    .filter((fact) => fact.value.trim())
    .sort((a, b) => {
      const confirmedDelta = Number(b.userConfirmed) - Number(a.userConfirmed);
      if (confirmedDelta !== 0) return confirmedDelta;
      return b.confidence - a.confidence || b.updatedAt - a.updatedAt;
    })
    .slice(0, limit)
    .map((fact) => `- ${factLabels[fact.type]}：${fact.value}`)
    .join('\n');
};

export const mergeProfileFacts = (
  profile: UserProfile,
  incomingFacts: ProfileFact[]
): UserProfile => {
  if (incomingFacts.length === 0) return profile;

  const facts = [...profile.facts];
  incomingFacts.forEach((incoming) => {
    const normalizedIncoming = normalizeValue(incoming.value);
    if (!normalizedIncoming) return;

    const existingIndex = facts.findIndex(
      (fact) =>
        fact.type === incoming.type &&
        (normalizeValue(fact.value) === normalizedIncoming ||
          shouldReplaceSameSlotFact(fact.type))
    );

    if (existingIndex >= 0) {
      const existing = facts[existingIndex];
      if (existing.userConfirmed && !incoming.userConfirmed) return;
      facts[existingIndex] = {
        ...existing,
        value: incoming.value,
        confidence: Math.max(existing.confidence, incoming.confidence),
        source: existing.userConfirmed ? existing.source : incoming.source,
        userConfirmed: existing.userConfirmed,
        updatedAt: incoming.updatedAt,
      };
      return;
    }

    facts.push(incoming);
  });

  return {
    ...profile,
    facts: facts
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_PROFILE_FACTS),
    updatedAt: Date.now(),
  };
};

export const upsertManualProfileFact = (
  profile: UserProfile,
  type: ProfileFactType,
  value: string,
  existingId?: string
): UserProfile => {
  const now = Date.now();
  const cleanValue = value.trim();
  if (!cleanValue) return profile;

  const facts = [...profile.facts];
  const index = existingId
    ? facts.findIndex((fact) => fact.id === existingId)
    : facts.findIndex((fact) => fact.type === type && shouldReplaceSameSlotFact(type));

  const nextFact: ProfileFact = {
    id: existingId ?? `profile_${now}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    value: cleanValue,
    confidence: 1,
    source: 'manual',
    userConfirmed: true,
    updatedAt: now,
  };

  if (index >= 0) facts[index] = nextFact;
  else facts.unshift(nextFact);

  return {
    ...profile,
    facts,
    updatedAt: now,
  };
};

export const deleteProfileFact = (profile: UserProfile, factId: string): UserProfile => ({
  ...profile,
  facts: profile.facts.filter((fact) => fact.id !== factId),
  updatedAt: Date.now(),
});

export const confirmProfileFact = (profile: UserProfile, factId: string): UserProfile => ({
  ...profile,
  facts: profile.facts.map((fact) =>
    fact.id === factId
      ? { ...fact, confidence: 1, userConfirmed: true, updatedAt: Date.now() }
      : fact
  ),
  updatedAt: Date.now(),
});

export const extractProfileFactsFromMessage = (
  userId: string,
  userMessage: string
): ProfileFact[] => {
  const text = userMessage.trim();
  if (!text) return [];

  const now = Date.now();
  const facts: Array<Omit<ProfileFact, 'id' | 'updatedAt' | 'source' | 'userConfirmed'>> = [];
  const pushFact = (type: ProfileFactType, value: string, confidence = 0.82) => {
    const cleanValue = cleanupFactValue(value);
    if (!cleanValue) return;
    facts.push({ type, value: cleanValue, confidence });
  };

  const displayName = matchFirst(text, [
    /我叫([\u4e00-\u9fa5A-Za-z0-9_-]{1,12})/,
    /(?:my name is|call me)\s+([A-Za-z0-9_-]{1,24})/i,
  ]);
  if (displayName) pushFact('displayName', displayName, 0.95);

  const preferredAddress = matchFirst(text, [
    /(?:别叫我|不要叫我).{0,12}(?:叫我|喊我)([\u4e00-\u9fa5A-Za-z0-9_-]{1,12})/,
    /(?:以后|你可以|希望你)?(?:叫我|称呼我)([\u4e00-\u9fa5A-Za-z0-9_-]{1,12})/,
  ]);
  if (preferredAddress) pushFact('preferredAddress', preferredAddress, 0.94);

  if (/(我是|我性别是|我是个)(男生|男的|男性|女生|女的|女性)/.test(text)) {
    const gender = text.match(/(男生|男的|男性|女生|女的|女性)/)?.[1];
    if (gender) pushFact('gender', gender.includes('男') ? '男' : '女', 0.96);
  }

  const hobbyText = matchFirst(text, [
    /(?:我喜欢|我爱|我的爱好是|平时喜欢)([^，。！？\n]{1,32})/,
    /(?:喜欢做|喜欢玩)([^，。！？\n]{1,24})/,
  ]);
  if (hobbyText) {
    splitList(hobbyText).forEach((item) => pushFact('hobby', item, 0.84));
  }

  const occupation = matchFirst(text, [
    /(?:我是|我在做|我现在是|我的工作是)(律师|设计师|学生|程序员|产品经理|老师|护士|医生|运营|销售|自由职业|研究生|大学生|高中生|上班族)/,
    /(?:我在|我就读于|我读)([^，。！？\n]{1,24})/,
  ]);
  if (occupation && !displayName) pushFact('occupationOrStudy', occupation, 0.82);

  const communicationPreference = matchFirst(text, [
    /(?:我希望|我更喜欢|你可以)([^，。！？\n]*(?:直接|温柔|慢一点|别太急|提醒我|不要评价|多问我)[^，。！？\n]*)/,
  ]);
  if (communicationPreference) pushFact('communicationPreference', communicationPreference, 0.86);

  const sensitiveBoundary = matchFirst(text, [
    /(?:我不喜欢|我讨厌|别|不要)([^，。！？\n]*(?:催|评价|命令|阴阳怪气|开玩笑|提这件事|问这个)[^，。！？\n]*)/,
  ]);
  if (sensitiveBoundary) pushFact('sensitiveBoundary', sensitiveBoundary, 0.86);

  return facts.map((fact, index) => ({
    ...fact,
    id: `profile_${userId}_${now}_${fact.type}_${index}`,
    source: 'conversation',
    userConfirmed: fact.confidence >= 0.95,
    updatedAt: now,
  }));
};

const matchFirst = (text: string, patterns: RegExp[]): string | null => {
  for (const pattern of patterns) {
    const value = text.match(pattern)?.[1]?.trim();
    if (value) return value;
  }
  return null;
};

const splitList = (value: string): string[] =>
  value
    .split(/[、,，和跟与]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= 16)
    .slice(0, 4);

const cleanupFactValue = (value: string): string =>
  value
    .replace(/^(是|叫|做|玩|被|你可以)/, '')
    .replace(/(这样子|这种|这些|那个|这个)$/g, '')
    .trim();

const normalizeValue = (value: string): string => value.trim().toLowerCase();

const shouldReplaceSameSlotFact = (type: ProfileFactType): boolean =>
  ['displayName', 'gender', 'preferredAddress', 'occupationOrStudy'].includes(type);
