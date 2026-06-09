import React from 'react';
import './PixelAvatar.css';

interface PixelAvatarProps {
  characterId: string;
  emotion: 'neutral' | 'happy' | 'upset';
  name: string;
  state?: CharacterVisualState;
  framing?: 'face' | 'bust';
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
  framing = 'bust',
}) => {
  if (!supportedCharacters.has(characterId)) return null;
  const visualState = state ?? emotion;
  const isEditorial = characterId === 'chen-wei';
  const assetRoot = framing === 'face'
    ? `/characters/${characterId}/portrait`
    : isEditorial
      ? `/characters/${characterId}/editorial`
      : `/characters/${characterId}`;
  const assetExtension = framing === 'face' || isEditorial ? 'webp' : 'png';

  return (
    <span
      className={`pixel-avatar ${characterId} ${visualState} framing-${framing} ${
        isEditorial ? 'is-editorial' : 'is-rendered'
      }`}
    >
      <img
        className="pixel-avatar__image"
        src={`${assetRoot}/${assetState[visualState]}.${assetExtension}`}
        alt={`${name}，${stateLabel[visualState]}`}
        draggable={false}
      />
    </span>
  );
};

export default PixelAvatar;
