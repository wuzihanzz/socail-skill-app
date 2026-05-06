import type { Character, Skill } from '../types/index';

/**
 * Get unlocked skills based on current trust level
 */
export const getUnlockedSkills = (
  character: Character,
  trustLevel: number,
  unlockedSkillIds: string[]
): Skill[] => {
  return character.skills.filter((skill) => {
    // Always visible skills
    if (skill.alwaysVisible) {
      return true;
    }
    // Already unlocked
    if (unlockedSkillIds.includes(skill.id)) {
      return true;
    }
    // Check if trust threshold is met
    return trustLevel >= skill.unlocksAt.trustThreshold;
  });
};

/**
 * Get skills that should be hidden in system prompt
 */
export const getHiddenSkills = (
  character: Character,
  trustLevel: number,
  unlockedSkillIds: string[]
): Skill[] => {
  return character.skills.filter((skill) => {
    if (skill.alwaysVisible) {
      return false;
    }
    if (unlockedSkillIds.includes(skill.id)) {
      return false;
    }
    return trustLevel < skill.unlocksAt.trustThreshold;
  });
};

/**
 * Check if a user topic should trigger revealing a hidden skill
 */
export const checkSkillTrigger = (
  userMessage: string,
  character: Character,
  trustLevel: number,
  unlockedSkillIds: string[]
): string | null => {
  const lowerMessage = userMessage.toLowerCase();

  // Find skills that are close to being unlocked
  const nearbySkills = character.skills.filter((skill) => {
    if (skill.alwaysVisible || unlockedSkillIds.includes(skill.id)) {
      return false;
    }
    // Skill is within 30% of trust threshold
    return (
      trustLevel >= skill.unlocksAt.trustThreshold * 0.7 &&
      trustLevel < skill.unlocksAt.trustThreshold
    );
  });

  // Check if user message matches trigger topics
  for (const skill of nearbySkills) {
    if (skill.unlocksAt.triggerTopics) {
      for (const topic of skill.unlocksAt.triggerTopics) {
        if (lowerMessage.includes(topic)) {
          return skill.id;
        }
      }
    }
  }

  return null;
};
