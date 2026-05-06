import type { Character } from '../types/index';

/**
 * Generate today's event for a character
 * If it's a new day, generate a new event
 */
export const generateTodayEvent = (
  character: Character,
  lastEventDate: string,
  alreadyTriggered: boolean
): string | null => {
  const today = new Date().toISOString().split('T')[0];

  // Event already triggered today
  if (alreadyTriggered && lastEventDate === today) {
    return null;
  }

  // New day, generate event
  if (lastEventDate !== today) {
    const eventPool = character.dailyEventPool;
    if (eventPool.length === 0) return null;

    const randomEvent = eventPool[Math.floor(Math.random() * eventPool.length)];
    return randomEvent;
  }

  return null;
};

/**
 * Get a random event from a character's event pool for a specific skill
 */
export const getSkillEvent = (
  character: Character,
  skillId: string
): string | null => {
  const skill = character.skills.find((s) => s.id === skillId);
  if (!skill || skill.eventPool.length === 0) {
    return null;
  }

  return skill.eventPool[Math.floor(Math.random() * skill.eventPool.length)];
};

/**
 * Format the event for inclusion in system prompt
 */
export const formatEventForPrompt = (
  event: string,
  characterName: string
): string => {
  return `今天${characterName}的情况：${event}`;
};
