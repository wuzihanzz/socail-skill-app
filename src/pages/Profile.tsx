import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import characters from '../data/characters';
import { useGameStore } from '../store/gameStore';
import PixelAvatar from '../components/PixelAvatar';
import TrustBar from '../components/TrustBar';
import { getUnlockedSkills } from '../engine/skillEngine';
import './Profile.css';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { currentCharacterId, relationships, updateUserNotes } = useGameStore();
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');

  // If no character is selected, redirect to characters page
  if (!currentCharacterId) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>请先选择一个人物</p>
        <button onClick={() => navigate('/characters')}>
          返回选择人物
        </button>
      </div>
    );
  }

  const character = characters.find((c) => c.id === currentCharacterId);
  const relationship = relationships[currentCharacterId];

  if (!character || !relationship) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>人物信息不存在</p>
        <button onClick={() => navigate('/chat')}>返回聊天</button>
      </div>
    );
  }

  // Ensure askedAbout has default values
  const askedAbout = relationship.askedAbout || {
    name: false,
    age: false,
    job: false,
    mbti: false,
    zodiac: false,
  };

  const unlockedSkills = getUnlockedSkills(
    character,
    relationship.trustLevel,
    relationship.unlockedSkills
  );

  const handleSaveNotes = () => {
    updateUserNotes(currentCharacterId, notes);
    setIsEditingNotes(false);
  };

  const handleEditNotes = () => {
    setNotes(relationship.userNotes);
    setIsEditingNotes(true);
  };

  return (
    <div className="profile-page">
      <header className="profile-header">
        <button className="back-button" onClick={() => navigate('/chat')}>
          ← 返回聊天
        </button>
        <h1>个人档案</h1>
      </header>

      <div className="profile-container">
        {/* Avatar Section */}
        <div className="profile-avatar-section">
          <div className="avatar-container-profile">
            <PixelAvatar
              characterId={character.id}
              emotion={relationship.currentEmotion}
              name={character.name}
            />
          </div>
          <TrustBar
            trustLevel={relationship.trustLevel}
            satisfactionLevel={relationship.satisfactionLevel}
          />
        </div>

        {/* Information Section */}
        <div className="profile-info-section">
          {/* Nickname / Real Name */}
          <div className="info-block">
            <h2 className="nickname">{character.nickname}</h2>
            <p className="real-name">
              真名：
              {askedAbout.name ? (
                <span className="text-unlocked">{character.name}</span>
              ) : (
                <span className="text-locked">●●●●●</span>
              )}
            </p>
          </div>

          {/* Basic Info */}
          <div className="info-block">
            <h3>基本信息</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>年龄</label>
                <p>
                  {askedAbout.age ? (
                    <span className="text-unlocked">{character.age}</span>
                  ) : (
                    <span className="text-locked">●●</span>
                  )}
                </p>
              </div>
              <div className="info-item">
                <label>职业</label>
                <p>
                  {askedAbout.job ? (
                    <span className="text-unlocked">{character.job}</span>
                  ) : (
                    <span className="text-locked">●●●●</span>
                  )}
                </p>
              </div>
              <div className="info-item">
                <label>星座</label>
                <p>
                  {askedAbout.zodiac ? (
                    <span className="text-unlocked">{character.zodiac}</span>
                  ) : (
                    <span className="text-locked">●●●●●</span>
                  )}
                </p>
              </div>
              <div className="info-item">
                <label>MBTI</label>
                <p>
                  {askedAbout.mbti ? (
                    <span className="text-unlocked">{character.mbti}</span>
                  ) : (
                    <span className="text-locked">●●●●</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Unlocked Skills */}
          <div className="info-block">
            <h3>了解的信息</h3>
            {unlockedSkills.length > 0 ? (
              <div className="skills-list">
                {unlockedSkills.map((skill) => (
                  <div key={skill.id} className="skill-item">
                    <h4>{skill.name}</h4>
                    <p>{skill.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">还没有了解这个人的特点呢</p>
            )}
          </div>

          {/* User Notes */}
          <div className="info-block notes-block">
            <div className="notes-header">
              <h3>我的笔记</h3>
              {!isEditingNotes && (
                <button
                  className="edit-button"
                  onClick={handleEditNotes}
                >
                  编辑
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="notes-editor">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="记录你对这个人的了解..."
                  rows={6}
                />
                <div className="notes-actions">
                  <button
                    className="save-button"
                    onClick={handleSaveNotes}
                  >
                    保存
                  </button>
                  <button
                    className="cancel-button"
                    onClick={() => setIsEditingNotes(false)}
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <div className="notes-display">
                {relationship.userNotes ? (
                  <p>{relationship.userNotes}</p>
                ) : (
                  <p className="empty-state">还没有笔记</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
