import React from 'react';
import './PixelAvatar.css';

interface PixelAvatarProps {
  characterId: string;
  emotion: 'neutral' | 'happy' | 'upset';
  name: string;
  state?: CharacterVisualState;
}

export type CharacterVisualState =
  | 'idle'
  | 'neutral'
  | 'thinking'
  | 'happy'
  | 'delighted'
  | 'puzzled'
  | 'upset';

const supportedCharacters = new Set(['chen-wei', 'lin-xue', 'xiao-mei']);
const assetState: Record<CharacterVisualState, string> = {
  idle: 'neutral',
  neutral: 'neutral',
  thinking: 'thinking',
  happy: 'happy',
  delighted: 'delighted',
  puzzled: 'puzzled',
  upset: 'upset',
};

const stateLabel: Record<CharacterVisualState, string> = {
  idle: '有点无聊地等着',
  neutral: '平静',
  thinking: '正在思考',
  happy: '开心',
  delighted: '很开心',
  puzzled: '有些疑惑',
  upset: '有点受伤',
};

const PixelAvatar: React.FC<PixelAvatarProps> = ({
  characterId,
  emotion,
  name,
  state,
}) => {
  if (!supportedCharacters.has(characterId)) return null;
  const visualState = state ?? emotion;

  return (
    <img
      className={`pixel-avatar ${characterId} ${visualState}`}
      src={`/characters/${characterId}/${assetState[visualState]}.png`}
      alt={`${name}，${stateLabel[visualState]}`}
      draggable={false}
    />
  );
};

export default PixelAvatar;
