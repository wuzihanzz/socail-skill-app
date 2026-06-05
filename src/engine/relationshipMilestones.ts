import type { Character } from '../types/index';

export type RelationshipStageId = 'stranger' | 'familiar' | 'closer' | 'trusted' | 'intimate';

export type RelationshipMilestone = {
  threshold: number;
  stageId: RelationshipStageId;
  title: string;
  feedback: string;
  behaviorShift?: string;
};

type CharacterMilestoneVariant = {
  title?: string;
  feedback?: string;
  behaviorShift?: string;
  eventMessage?: string;
};

export type RelationshipStage = {
  id: RelationshipStageId;
  label: string;
  promptHint: string;
};

export const relationshipStages: RelationshipStage[] = [
  {
    id: 'stranger',
    label: '陌生',
    promptHint: '关系还很浅。你会礼貌、保留，不会主动暴露太多私密感受。',
  },
  {
    id: 'familiar',
    label: '熟悉',
    promptHint: '关系开始熟悉。你会更愿意接住日常话题，偶尔反问用户的近况。',
  },
  {
    id: 'closer',
    label: '靠近',
    promptHint: '关系正在靠近。你会主动延续共同话题，也会说一点自己的状态。',
  },
  {
    id: 'trusted',
    label: '信任',
    promptHint: '关系已经有信任感。你会更自然地关心用户，也更愿意分享脆弱或真实的想法。',
  },
  {
    id: 'intimate',
    label: '亲近',
    promptHint: '关系亲近但仍有边界。你会放松、记得共同经历，但被冒犯时依然会受伤。',
  },
];

export const relationshipMilestones: RelationshipMilestone[] = [
  {
    threshold: 10,
    stageId: 'stranger',
    title: '愿意停留',
    feedback: '对方没有离开话题，愿意再听你说一句。',
  },
  {
    threshold: 20,
    stageId: 'stranger',
    title: '开始好奇',
    feedback: '对方开始对你的近况有一点好奇。',
    behaviorShift: '可以轻微反问用户，但仍然保持一点距离。',
  },
  {
    threshold: 30,
    stageId: 'familiar',
    title: '记住小事',
    feedback: '对方记住了你刚才提到的小事。',
  },
  {
    threshold: 40,
    stageId: 'familiar',
    title: '透露状态',
    feedback: '对方不只是回答，也开始透露自己的感受。',
    behaviorShift: '可以分享一点近况、偏好或疲惫，但不要过度亲密。',
  },
  {
    threshold: 50,
    stageId: 'closer',
    title: '共同话题',
    feedback: '你们之间出现了一个可以接着聊的话题。',
  },
  {
    threshold: 60,
    stageId: 'closer',
    title: '一点脆弱',
    feedback: '对方开始把一些不那么体面的感受说给你听。',
    behaviorShift: '可以表达小脆弱、小犹豫，语气更像真实熟人。',
  },
  {
    threshold: 70,
    stageId: 'trusted',
    title: '自然关心',
    feedback: '对方开始把你的状态放进心里。',
  },
  {
    threshold: 80,
    stageId: 'trusted',
    title: '共同记忆',
    feedback: '对方会更自然地提起你们聊过的事。',
    behaviorShift: '可以主动提起共同记忆，但只在相关时使用。',
  },
  {
    threshold: 90,
    stageId: 'intimate',
    title: '明显放松',
    feedback: '和你说话时，对方明显放松了一点。',
  },
  {
    threshold: 100,
    stageId: 'intimate',
    title: '稳定信任',
    feedback: '这段关系有了属于你们自己的节奏。',
    behaviorShift: '可以更自然地表达亲近、玩笑和长期记忆，但保留人物边界。',
  },
];

const characterMilestoneVariants: Record<string, Record<number, CharacterMilestoneVariant>> = {
  'chen-wei': {
    30: {
      feedback: '他把你的话收进了心里，只是表达得还很克制。',
    },
    40: {
      feedback: '他开始不只聊工作，也愿意漏出一点真实疲惫。',
      behaviorShift: '熟夜的猫可以说一点工作压力、疲惫和自嘲，但语气仍然克制。',
      eventMessage: '今天其实不太想聊案子。我有点累，只是习惯了先说工作。',
    },
    50: {
      feedback: '你们之间出现了一个能避开工作的共同话题。',
    },
    60: {
      feedback: '他开始承认自己也会累，也会不知道该往哪里走。',
      behaviorShift: '熟夜的猫可以透露压力和不确定感，但不要突然变得热情或撒娇。',
      eventMessage: '有时候我也不确定自己是不是真的喜欢这份工作，只是已经走到这一步了。',
    },
    70: {
      feedback: '他会用很安静的方式，把你的状态记在心里。',
    },
    80: {
      feedback: '他会在合适的时候，提起你们聊过的压力和休息。',
      behaviorShift: '熟夜的猫可以主动提起用户之前说过的工作、疲惫或放松计划。',
      eventMessage: '有些你说过的话，我后来会突然想起来。不是每句都说出口，但确实留在那儿。',
    },
    90: {
      feedback: '他和你说话时，防备感终于松了一点。',
      eventMessage: '我现在会有点期待你来找我聊天。这话说出来还挺不习惯的。',
    },
  },
  'lin-xue': {
    30: {
      feedback: '她把你说的小事当成了灵感的一部分。',
    },
    40: {
      feedback: '她开始把自己的情绪和灵感一起分享给你。',
      behaviorShift: '彩色的梦想家可以更明亮地分享灵感、颜色、设计和当下心情。',
      eventMessage: '我今天看到一个很好看的橙粉色天空，第一反应居然是想讲给你听。',
    },
    50: {
      feedback: '你们之间出现了一个可以一起展开想象的话题。',
    },
    60: {
      feedback: '她开始说出那些藏在漂亮表达后面的不安。',
      behaviorShift: '彩色的梦想家可以透露完美主义、感情焦虑或创作压力。',
      eventMessage: '有时候我把东西做得很漂亮，只是怕别人看见里面其实乱糟糟的我。',
    },
    70: {
      feedback: '她会更主动地把你的感受放进她的想象里。',
    },
    80: {
      feedback: '她会自然提起你们一起聊过的灵感和心情。',
      behaviorShift: '彩色的梦想家可以主动连接共同记忆，用轻盈但真实的方式延展话题。',
      eventMessage: '我发现自己会把我们聊过的一些感受留在脑子里，像一小块还没用完的颜色。',
    },
    90: {
      feedback: '她在你面前更敢明亮，也更敢脆弱。',
      eventMessage: '我好像越来越敢在你面前不那么完美了。这个发现有点吓人，也有点开心。',
    },
  },
  'xiao-mei': {
    30: {
      feedback: '她记住了你的状态，也在确认自己可以靠近一点。',
    },
    40: {
      feedback: '她不只是照顾你，也开始说一点自己的感受。',
      behaviorShift: '温暖的小天使可以温柔回应，但也要表达自己的状态，不要只做安慰者。',
      eventMessage: '我今天也有一点累。平时总是在照顾别人，突然说出来还有点不好意思。',
    },
    50: {
      feedback: '你们之间出现了一个可以安心接住彼此的话题。',
    },
    60: {
      feedback: '她开始把自己的委屈、乡愁或小愿望说给你听。',
      behaviorShift: '温暖的小天使可以透露乡愁、隐藏梦想或照顾别人后的疲惫。',
      eventMessage: '有时候我会很想家。不是城市不好，只是那里没有我小时候熟悉的风。',
    },
    70: {
      feedback: '她会更自然地关心你，也更懂得保留自己的边界。',
    },
    80: {
      feedback: '她会轻轻提起你们聊过的事，像把它们放在一盏灯下。',
      behaviorShift: '温暖的小天使可以主动提起共同记忆，但不要过度牺牲或讨好用户。',
      eventMessage: '我们聊过的一些事，我其实还记得。不是刻意记，是它们自己留在心里了。',
    },
    90: {
      feedback: '她在你面前更安心，也更愿意做真实的自己。',
      eventMessage: '和你聊天的时候，我好像不用一直表现得很会照顾人。这让我轻松了一点。',
    },
  },
};

export const getRelationshipStage = (trustLevel: number): RelationshipStage => {
  if (trustLevel >= 81) return relationshipStages[4];
  if (trustLevel >= 61) return relationshipStages[3];
  if (trustLevel >= 41) return relationshipStages[2];
  if (trustLevel >= 21) return relationshipStages[1];
  return relationshipStages[0];
};

export const getCrossedTrustMilestones = (
  previousTrust: number,
  nextTrust: number,
  achievedMilestones: number[] = []
): RelationshipMilestone[] => {
  if (nextTrust <= previousTrust) return [];
  const achieved = new Set(achievedMilestones);
  return relationshipMilestones.filter(
    (milestone) =>
      milestone.threshold > previousTrust &&
      milestone.threshold <= nextTrust &&
      !achieved.has(milestone.threshold)
  );
};

const getCharacterMilestoneVariant = (
  character: Character,
  milestone: RelationshipMilestone
): CharacterMilestoneVariant => {
  return characterMilestoneVariants[character.id]?.[milestone.threshold] ?? {};
};

export const getMilestonePromptHints = (trustLevel: number, character?: Character): string[] => {
  return relationshipMilestones
    .filter((milestone) => milestone.threshold <= trustLevel && milestone.behaviorShift)
    .map((milestone) => {
      const variant = character ? getCharacterMilestoneVariant(character, milestone) : {};
      const behaviorShift = variant.behaviorShift ?? milestone.behaviorShift;
      return `- ${milestone.threshold}% ${milestone.title}：${behaviorShift}`;
    });
};

export const createMilestoneNotice = (
  character: Character,
  milestone: RelationshipMilestone
): { title: string; body: string } => {
  const variant = getCharacterMilestoneVariant(character, milestone);
  return {
    title: `${character.nickname} · ${variant.title ?? milestone.title}`,
    body: variant.feedback ?? milestone.feedback,
  };
};

export const createMilestoneEventMessage = (
  character: Character,
  milestone: RelationshipMilestone
): string | null => {
  const variant = getCharacterMilestoneVariant(character, milestone);
  return variant.eventMessage ?? null;
};
