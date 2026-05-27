import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import characters from '../data/characters';
import { useGameStore } from '../store/gameStore';
import PixelAvatar from '../components/PixelAvatar';

const Characters: React.FC = () => {
  const navigate = useNavigate();
  const { relationships, setCurrentCharacter } = useGameStore();

  useEffect(() => {
    useGameStore.getState().loadFromStorage();
  }, []);

  const handleSelect = (characterId: string) => {
    setCurrentCharacter(characterId);
    navigate('/chat');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-purple-600 text-sm font-medium px-2 py-1 rounded-lg hover:bg-purple-50 active:scale-95 transition-all flex-shrink-0"
          >
            ← 返回
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">选择对话伙伴</h1>
            <p className="text-xs text-gray-400 truncate">每个人都有独特的故事</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Character Cards */}
        <div className="space-y-3">
          {characters.map((character) => {
            const rel = relationships[character.id];
            const unlockedCount = rel?.unlockedSkills.length ?? 0;
            const trustLevel = rel?.trustLevel ?? 0;

            return (
              <button
                key={character.id}
                onClick={() => handleSelect(character.id)}
                className="w-full bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 text-left hover:border-purple-300 hover:shadow-sm active:scale-[0.99] transition-all"
              >
                {/* Avatar */}
                <div className="flex-shrink-0 w-16 h-20 bg-gradient-to-b from-gray-100 to-gray-200 rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center">
                  <PixelAvatar
                    characterId={character.id}
                    emotion={rel?.currentEmotion ?? 'neutral'}
                    name={character.name}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-gray-900 text-base">{character.nickname}</span>
                    <span className="text-xs text-gray-400">{character.age}岁</span>
                  </div>
                  <p className="text-xs text-gray-400 italic truncate mb-2">{character.signature}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {unlockedCount > 0 && (rel?.conversationHistory.length ?? 0) > 0 && (
                      <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                        已了解 {unlockedCount}/{character.skills.length}
                      </span>
                    )}
                  </div>

                  {/* Trust bar */}
                  {trustLevel > 0 && (rel?.conversationHistory.length ?? 0) > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full transition-all"
                          style={{ width: `${trustLevel}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{trustLevel.toFixed(2)}%</span>
                    </div>
                  )}
                </div>

                <span className="text-gray-300 flex-shrink-0 text-lg">›</span>
              </button>
            );
          })}
        </div>

        {/* Tips panel */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-blue-700 mb-2">📌 记住</h3>
          <ul className="space-y-1">
            {['认真倾听他们说什么', '表达你的理解和同情', '在冲突中主动修复关系'].map((t) => (
              <li key={t} className="text-xs text-blue-600 flex items-start gap-1.5">
                <span className="mt-0.5 flex-shrink-0">✓</span>{t}
              </li>
            ))}
            {['说冷漠或伤人的话', '无视他们的感受'].map((t) => (
              <li key={t} className="text-xs text-red-400 flex items-start gap-1.5">
                <span className="mt-0.5 flex-shrink-0">✗</span>{t}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
};

export default Characters;
