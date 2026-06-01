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
    <div className="min-h-screen bg-[#f6f5f2] text-gray-950">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          <button
            onClick={() => navigate('/')}
            className="flex-shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 active:scale-95"
          >
            返回
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight text-gray-950">选择对话对象</h1>
            <p className="truncate text-xs text-gray-500">每个人都有自己的节奏和边界</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            ['对象', characters.length.toString()],
            ['状态', '练习'],
            ['目标', '信任'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[8px] border border-gray-200 bg-white px-3 py-3 shadow-sm">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="mt-1 text-base font-bold text-gray-950">{value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {characters.map((character) => {
            const rel = relationships[character.id];
            const unlockedCount = rel?.unlockedSkills.length ?? 0;
            const trustLevel = rel?.trustLevel ?? 25;
            const messageCount = rel?.conversationHistory.length ?? 0;

            return (
              <button
                key={character.id}
                onClick={() => handleSelect(character.id)}
                className="flex w-full items-center gap-4 rounded-[8px] border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-gray-300 hover:bg-gray-50 active:scale-[0.99]"
              >
                <div className="flex h-20 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-gray-200 bg-gray-100">
                  <PixelAvatar
                    characterId={character.id}
                    emotion={rel?.currentEmotion ?? 'neutral'}
                    name={character.name}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center justify-between gap-3">
                    <span className="truncate text-base font-bold text-gray-950">{character.nickname}</span>
                    <span className="text-xs text-gray-400">{trustLevel.toFixed(0)}%</span>
                  </div>
                  <p className="mb-2 truncate text-xs text-gray-500">
                    {messageCount > 0 ? '继续这段对话' : '等待你开启关系'}
                  </p>
                  <p className="mb-3 line-clamp-2 text-xs leading-5 text-gray-500">
                    {character.signature || character.background}
                  </p>

                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      已了解 {unlockedCount}/{character.skills.length}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                      {messageCount > 0 ? `${messageCount} 条记录` : '未开始'}
                    </span>
                  </div>

                  <div className="h-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${trustLevel}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-[8px] border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900">练习提醒</h3>
          <div className="mt-3 space-y-2">
            {[
              '认真回应对方真正表达的感受',
              '关系紧张时先修复，再追问',
              '不要把建议说得像评判',
            ].map((text) => (
              <div key={text} className="flex items-start gap-2 text-xs leading-5 text-gray-600">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Characters;
