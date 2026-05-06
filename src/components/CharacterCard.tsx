import React from 'react';
import type { Character } from '../types/index';
import PixelAvatar from './PixelAvatar';
import './CharacterCard.css';

interface CharacterCardProps {
  character: Character;
  unlockedSkillsCount?: number;
  totalSkills?: number;
  onClick?: () => void;
}

const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  unlockedSkillsCount = 0,
  totalSkills = 3,
  onClick,
}) => {
  return (
    <div className="character-card" onClick={onClick}>
      <div className="avatar-section">
        <PixelAvatar
          characterId={character.id}
          emotion="neutral"
          name={character.name}
        />
      </div>

      <div className="info-section">
        <div className="nickname">{character.nickname}</div>
        <div className="signature">{character.signature}</div>

        {unlockedSkillsCount > 0 && (
          <div className="skills-unlocked">
            已解锁 {unlockedSkillsCount}/{totalSkills} 特质
          </div>
        )}

        <div className="cta">点击开始对话</div>
      </div>
    </div>
  );
};

export default CharacterCard;
