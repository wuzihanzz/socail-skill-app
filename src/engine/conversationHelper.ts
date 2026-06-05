export type ConversationTip = {
  id: string;
  label: string;
  title: string;
  guidance: string[];
  example: string;
};

export type ConversationTipContext = {
  trustLevel?: number;
  emotion?: 'neutral' | 'happy' | 'upset';
  conflictState?: 'none' | 'awkward' | 'hurt' | 'defensive' | 'withdrawn' | 'repairing';
  lastUserMessage?: string;
  lastTrustDelta?: number;
};

const tipLibrary: Record<string, ConversationTip> = {
  open: {
    id: 'open',
    label: '自然开场',
    title: '先把对话轻轻打开',
    guidance: ['一句问候就够了', '不要一开始问太重', '给对方一点选择空间'],
    example: '今天过得怎么样？想随便聊聊，还是想安静一会儿？',
  },
  shareState: {
    id: 'share-state',
    label: '说说状态',
    title: '用一点自己的状态换来真实感',
    guidance: ['只分享一点点就好', '不要把压力全丢给对方', '结尾可以留一个轻问题'],
    example: '我今天有点累，不过还是想来和你说说话。你今天还好吗？',
  },
  retry: {
    id: 'retry',
    label: '稍后重试',
    title: '刚才不是你说错了，是连接出了点问题',
    guidance: ['可以先保留原本想说的话', '稍后再发一次', '也可以换一句更短的开场'],
    example: '我刚才那句话可能没发出去，我再说一次：今天想和你聊两句。',
  },
  empathize: {
    id: 'empathize',
    label: '接住情绪',
    title: '先让对方感觉被听见',
    guidance: ['复述你听到的感受', '不要急着讲道理', '可以承认这件事确实不容易'],
    example: '听起来你这阵子真的有点累，我能理解为什么会这样。',
  },
  askContext: {
    id: 'ask-context',
    label: '轻轻追问',
    title: '问一个不会给压力的问题',
    guidance: ['只追问一个细节', '问题要具体一点', '语气保持轻，不要像审问'],
    example: '如果你愿意说的话，最让你卡住的是哪一部分？',
  },
  encourage: {
    id: 'encourage',
    label: '给点支持',
    title: '支持对方，但别替对方做决定',
    guidance: ['先肯定对方已经做的努力', '建议要留有余地', '避免一句话把问题说简单'],
    example: '你已经在很认真地处理这件事了，也许可以先从最小的一步开始。',
  },
  answer: {
    id: 'answer',
    label: '认真回答',
    title: '先回应问题，再补一点你的想法',
    guidance: ['不要绕开对方的问题', '回答可以短一点', '结尾留一个继续聊的空间'],
    example: '我会这么想：先把最重要的那件事说清楚，再慢慢解释原因。',
  },
  share: {
    id: 'share',
    label: '分享一点',
    title: '用自己的经历拉近一点距离',
    guidance: ['分享和对方有关的一小段', '不要抢走对方的话题', '分享后把话题交还给对方'],
    example: '我以前也有过类似的感觉，所以能懂那种不知道怎么开口的卡住。',
  },
  celebrate: {
    id: 'celebrate',
    label: '一起高兴',
    title: '把对方的好消息认真接住',
    guidance: ['明确表达开心或祝贺', '点出你在为哪件事高兴', '再问一个具体细节'],
    example: '这真的挺值得开心的，你最有成就感的是哪一刻？',
  },
  curiosity: {
    id: 'curiosity',
    label: '继续探索',
    title: '把话题往更真实的地方带一点',
    guidance: ['从对方刚说的话里选一个点', '问感受，不只问信息', '保持开放，不替对方总结'],
    example: '你刚刚说到这里的时候，我有点好奇，那对你意味着什么？',
  },
  repair: {
    id: 'repair',
    label: '修复一下',
    title: '如果刚才没接好，可以先承认影响',
    guidance: ['承认刚才可能让对方不舒服', '不要急着为自己辩解', '给对方一点空间'],
    example: '我刚才那样说可能有点急了，如果让你不舒服，我想先道个歉。',
  },
  specificRepair: {
    id: 'specific-repair',
    label: '具体修复',
    title: '别只说对不起，要说清楚你理解到的影响',
    guidance: ['点出刚才哪句话伤人', '承认影响而不是解释动机', '给对方一点恢复空间'],
    example: '我刚才把话说得太重了，可能让你觉得被否定了。这个影响我应该承认。',
  },
  restartSoftly: {
    id: 'restart-softly',
    label: '重开一句',
    title: '把同一个意思换成更容易被接住的说法',
    guidance: ['保留真正想问的部分', '去掉评价和催促', '用“我想了解”开头会柔和很多'],
    example: '我想重新问一次：我其实是想了解你最近的状态，不是想评价你。',
  },
  respectBoundary: {
    id: 'respect-boundary',
    label: '留点空间',
    title: '给对方选择权，关系会更容易松动',
    guidance: ['承认这个问题可能有点近', '允许对方先不回答', '表达你愿意换个问法'],
    example: '如果这个问题太私人，可以先不说。你也可以提醒我，我会换个问法。',
  },
  deepenTopic: {
    id: 'deepen-topic',
    label: '深入一点',
    title: '顺着对方刚透露的线索往下走',
    guidance: ['抓住一个关键词继续', '问感受而不只问信息', '不要一次问太多问题'],
    example: '你刚才说“撑不住”的时候，我有点在意。那通常会发生在什么时刻？',
  },
  reflectMeaning: {
    id: 'reflect-meaning',
    label: '确认理解',
    title: '先确认你听懂了，再继续追问',
    guidance: ['复述你听到的核心感受', '用“我理解得对吗”降低压力', '让对方有修正你的空间'],
    example: '我理解的是，你不是不想努力，而是已经累到不知道怎么停下来。是这样吗？',
  },
  gentleInvite: {
    id: 'gentle-invite',
    label: '轻轻邀请',
    title: '高信任时，可以表达你还想继续连接',
    guidance: ['表达你还愿意继续聊', '同时尊重对方边界', '不要把对方拉回来得太用力'],
    example: '我还挺想继续听你说的，但如果你现在想停一下，我也可以等你。',
  },
};

const pickTips = (ids: string[]): ConversationTip[] => {
  const uniqueIds = Array.from(new Set(ids));
  return uniqueIds.reduce<ConversationTip[]>((result, id) => {
    const tip = tipLibrary[id];
    if (tip) result.push(tip);
    return result;
  }, []).slice(0, 3);
};

const hasAny = (text: string, keywords: string[]): boolean => keywords.some((word) => text.includes(word));

/**
 * Generate conversational tips based on AI's last message.
 */
export const generateConversationTips = (
  aiMessage: string,
  context: ConversationTipContext = {}
): ConversationTip[] => {
  const lower = aiMessage.toLowerCase();
  const userLower = context.lastUserMessage?.toLowerCase() ?? '';

  if (!lower.trim()) {
    return pickTips(['open', 'shareState', 'curiosity']);
  }

  if (lower.includes('遇到了一些问题') || lower.includes('再试一次')) {
    return pickTips(['retry', 'open', 'shareState']);
  }

  // Keywords for different scenarios
  const sadKeywords = ['难', '累', '烦', '不开心', '失望', '伤心', '无奈', '生气', '郁闷'];
  const questionKeywords = ['吗', '呢', '怎么', '什么', '为什么', '如何', '是不是', '？'];
  const positiveKeywords = ['高兴', '开心', '太好了', '不错', '顺利', '成功', '完成', '期待', '轻松'];
  const personalKeywords = ['我', '我的', '我觉得', '我想', '我经历'];
  const conflictKeywords = ['不舒服', '算了', '别说了', '有点过', '冒犯', '伤人', '不想聊', '改天再说'];
  const apologyKeywords = ['抱歉', '对不起', '不好意思', '我刚才', '我不是故意', '我收回'];
  const depthKeywords = ['其实', '有时候', '一直', '压力', '累', '害怕', '不确定', '不知道', '撑不住', '负罪感'];
  const boundaryKeywords = ['不想说', '先不说', '太私人', '不方便', '不想聊', '以后再说'];
  const repairUserKeywords = ['对不起', '抱歉', '不好意思', '我错了', '说得太冲', '让你不舒服', '换个问法'];

  const tips: string[] = [];

  const looksTense =
    ['hurt', 'defensive', 'withdrawn', 'repairing'].includes(context.conflictState ?? 'none') ||
    (context.lastTrustDelta ?? 0) < -2 ||
    hasAny(lower, conflictKeywords) ||
    hasAny(userLower, apologyKeywords);

  if (looksTense) {
    if (hasAny(userLower, repairUserKeywords) || context.conflictState === 'repairing') {
      tips.push('specificRepair');
      tips.push('restartSoftly');
      tips.push('respectBoundary');
    } else {
      tips.push('repair');
      tips.push('specificRepair');
      tips.push('respectBoundary');
    }
  }

  if (hasAny(lower, boundaryKeywords)) {
    tips.push('respectBoundary');
    tips.push('restartSoftly');
    tips.push('gentleInvite');
  }

  // Sad/stressed situation
  if (hasAny(lower, sadKeywords)) {
    tips.push('empathize');
    tips.push('reflectMeaning');
    tips.push('askContext');
    tips.push('encourage');
  }

  if (context.emotion === 'upset' && !looksTense) {
    tips.push('empathize');
    tips.push('askContext');
  }

  // They're asking questions
  if (hasAny(lower, questionKeywords)) {
    tips.push('answer');
    if ((context.trustLevel ?? 25) >= 35) tips.push('share');
    else tips.push('askContext');
  }

  // Positive news
  if (hasAny(lower, positiveKeywords) || context.emotion === 'happy') {
    tips.push('celebrate');
    tips.push('curiosity');
  }

  // Personal stories
  if (hasAny(lower, personalKeywords)) {
    if ((context.trustLevel ?? 25) >= 35 && !looksTense) tips.push('share');
    if (hasAny(lower, depthKeywords)) tips.push('deepenTopic');
    tips.push('reflectMeaning');
    tips.push('empathize');
    tips.push('askContext');
  }

  if (hasAny(lower, depthKeywords) && !looksTense) {
    tips.push('deepenTopic');
    tips.push('reflectMeaning');
    if ((context.trustLevel ?? 25) >= 55) tips.push('gentleInvite');
  }

  // Default tips if none match
  if (tips.length === 0) {
    tips.push('curiosity');
    tips.push('askContext');
    tips.push('share');
  }

  return pickTips(tips);
};
