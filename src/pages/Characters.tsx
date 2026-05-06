import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import characters from '../data/characters';
import { useGameStore } from '../store/gameStore';
import CharacterCard from '../components/CharacterCard';
import './Characters.css';

const Characters: React.FC = () => {
  const navigate = useNavigate();
  const { relationships, setCurrentCharacter } = useGameStore();

  useEffect(() => {
    useGameStore.getState().loadFromStorage();
  }, []);

  const handleSelectCharacter = (characterId: string) => {
    setCurrentCharacter(characterId);
    navigate('/chat');
  };

  return (
    <div className="characters-page">
      <header className="characters-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← 返回
        </button>
        <h1>选择你的对话伙伴</h1>
        <p>每个人都有自己独特的故事。通过对话，你会慢慢了解他们。</p>
      </header>

      <div className="characters-grid">
        {characters.map((character) => (
          <div
            key={character.id}
            onClick={() => handleSelectCharacter(character.id)}
          >
            <CharacterCard
              character={character}
              unlockedSkillsCount={
                relationships[character.id]?.unlockedSkills.length || 0
              }
              totalSkills={character.skills.length}
            />
          </div>
        ))}
      </div>

      <section className="tips-section">
        <h2>📌 记住</h2>
        <ul>
          <li>✅ 认真倾听他们说什么</li>
          <li>✅ 表达你的理解和同情</li>
          <li>✅ 在冲突中主动修复关系</li>
          <li>❌ 不要说冷漠或伤人的话</li>
          <li>❌ 不要无视他们的感受</li>
        </ul>
      </section>
    </div>
  );
};

export default Characters;
