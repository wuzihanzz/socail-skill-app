/**
 * Generate conversational tips based on AI's last message
 */
export const generateConversationTips = (aiMessage: string): string[] => {
  const lower = aiMessage.toLowerCase();

  // Keywords for different scenarios
  const sadKeywords = ['难', '累', '烦', '不开心', '失望', '伤心', '无奈', '生气', '郁闷'];
  const questionKeywords = ['吗', '呢', '怎么', '什么', '为什么', '如何', '是不是', '？'];
  const positiveKeywords = ['高兴', '开心', '棒', '好', '成功', '完成', '开心', '期待'];
  const personalKeywords = ['我', '我的', '我觉得', '我想', '我经历'];

  const tips: string[] = [];

  // Sad/stressed situation
  if (sadKeywords.some(word => lower.includes(word))) {
    tips.push('💭 表示理解和同情');
    tips.push('🔍 询问发生了什么');
    tips.push('💪 给予鼓励或建议');
  }

  // They're asking questions
  if (questionKeywords.some(word => lower.includes(word))) {
    tips.push('✍️ 直接回答问题');
    tips.push('🎯 分享相关经验');
  }

  // Positive news
  if (positiveKeywords.some(word => lower.includes(word))) {
    tips.push('🎉 表示祝贺和喜悦');
    tips.push('❓ 询问更多细节');
  }

  // Personal stories
  if (personalKeywords.some(word => lower.includes(word))) {
    tips.push('🤝 分享自己类似的经历');
    tips.push('👂 继续倾听和提问');
  }

  // Default tips if none match
  if (tips.length === 0) {
    tips.push('💬 继续对话，表示兴趣');
    tips.push('❓ 提出相关问题');
    tips.push('📝 分享你的想法');
  }

  // Return max 3 tips
  return tips.slice(0, 3);
};
