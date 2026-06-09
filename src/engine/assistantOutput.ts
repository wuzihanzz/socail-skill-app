const ACTION_CUES =
  /微微|肩膀|声音|语气|抬头|低头|低下头|抬起头|皱眉|叹气|停顿|沉默|看向|移开|眼神|嘴角|点头|摇头|耸肩|靠近|后退|坐下|站起|呼吸|放松|一愣|愣住|顿了顿|轻声|小声|笑了笑|苦笑|手指|双手|抱臂/;

const removeActionAside = (value: string, pattern: RegExp): string =>
  value.replace(pattern, (match, inner: string) => (ACTION_CUES.test(inner) ? '' : match));

export const sanitizeAssistantMessage = (value: string): string => {
  let cleaned = value.trim();
  cleaned = removeActionAside(cleaned, /（([^（）]{1,48})）/g);
  cleaned = removeActionAside(cleaned, /\(([^()]{1,48})\)/g);
  cleaned = removeActionAside(cleaned, /\*([^*]{1,48})\*/g);
  cleaned = removeActionAside(cleaned, /【([^【】]{1,48})】/g);
  cleaned = cleaned
    .replace(/^(?:声音|语气)(?:变得|稍微|轻了|低了|柔和了)[^，,]{0,14}[，,]\s*/u, '')
    .replace(/^(?:我)?(?:微微)?(?:一愣|愣住|皱眉|叹了口气|点点头|摇摇头|耸耸肩|低下头|抬起头|笑了笑|苦笑)[，,]?\s*/u, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned;
};
