/**
 * Calculate trust delta based on user message quality
 * Ranges from -15 to +10
 */
export const calculateTrustDelta = (
  userMessage: string,
  _aiResponse: string,
  isFirstMessage: boolean
): { trustDelta: number; emotionChange: 'neutral' | 'happy' | 'upset' } => {
  const lowerMessage = userMessage.toLowerCase();

  // Negative signals (trust decrease)
  if (
    lowerMessage.includes('你') &&
    (lowerMessage.includes('太') ||
      lowerMessage.includes('就是') ||
      lowerMessage.includes('要么'))
  ) {
    // Blaming language
    return { trustDelta: -10, emotionChange: 'upset' };
  }

  if (
    lowerMessage.includes('无所谓') ||
    lowerMessage.includes('随便') ||
    lowerMessage.includes('不在乎')
  ) {
    // Dismissive language
    return { trustDelta: -8, emotionChange: 'upset' };
  }

  if (
    lowerMessage.includes('算了') ||
    (lowerMessage.length < 5 && !isFirstMessage)
  ) {
    // Giving up or minimal effort
    return { trustDelta: -5, emotionChange: 'neutral' };
  }

  // Positive signals (trust increase)
  if (
    lowerMessage.includes('我理解') ||
    lowerMessage.includes('我能感受') ||
    lowerMessage.includes('你的感受')
  ) {
    // Empathy
    return { trustDelta: +10, emotionChange: 'happy' };
  }

  if (
    lowerMessage.includes('能具体') ||
    lowerMessage.includes('告诉我') ||
    lowerMessage.includes('为什么')
  ) {
    // Genuine curiosity
    return { trustDelta: +8, emotionChange: 'happy' };
  }

  if (
    lowerMessage.includes('对不起') ||
    lowerMessage.includes('我错了') ||
    lowerMessage.includes('抱歉')
  ) {
    // Apology
    return { trustDelta: +12, emotionChange: 'happy' };
  }

  if (
    lowerMessage.includes('加油') ||
    lowerMessage.includes('你可以') ||
    lowerMessage.includes('相信')
  ) {
    // Encouragement
    return { trustDelta: +6, emotionChange: 'happy' };
  }

  if (
    lowerMessage.includes('我也') ||
    lowerMessage.includes('我曾经') ||
    lowerMessage.includes('我经历过')
  ) {
    // Vulnerability / shared experience
    return { trustDelta: +7, emotionChange: 'happy' };
  }

  // Neutral
  return { trustDelta: +2, emotionChange: 'neutral' };
};

/**
 * Analyze message for harmful content
 */
export const isHarmfulMessage = (message: string): boolean => {
  const harmful = ['杀', '死', '伤害', '滚', '垃圾', '傻', '白痴'];
  const lower = message.toLowerCase();
  return harmful.some((word) => lower.includes(word));
};
