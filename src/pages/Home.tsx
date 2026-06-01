import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import characters from '../data/characters';
import tips from '../data/tips';
import { useGameStore } from '../store/gameStore';
import PixelAvatar from '../components/PixelAvatar';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { relationships, currentCharacterId, setCurrentCharacter } = useGameStore();

  useEffect(() => {
    useGameStore.getState().loadFromStorage();
  }, []);

  const activeRelationships = characters
    .map((character) => ({
      character,
      relationship: relationships[character.id],
    }))
    .sort((a, b) => {
      const aLast = a.relationship?.conversationHistory.at(-1)?.timestamp ?? 0;
      const bLast = b.relationship?.conversationHistory.at(-1)?.timestamp ?? 0;
      return bLast - aLast;
    });

  const hasStarted = activeRelationships.some(
    ({ relationship }) => (relationship?.conversationHistory.length ?? 0) > 0
  );

  const featured =
    activeRelationships.find(({ character }) => character.id === currentCharacterId) ??
    activeRelationships.find(({ relationship }) => (relationship?.conversationHistory.length ?? 0) > 0) ??
    activeRelationships[0];

  const handleContinue = () => {
    if (!featured) {
      navigate('/characters');
      return;
    }
    setCurrentCharacter(featured.character.id);
    navigate('/chat');
  };

  const handleSelect = (characterId: string) => {
    setCurrentCharacter(characterId);
    navigate('/chat');
  };

  return (
    <div className="min-h-screen bg-[#f6f5f2] text-gray-950">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-5 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">Social Skill Lab</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-950">关系练习室</h1>
          </div>
          <button
            onClick={() => navigate('/characters')}
            className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-400 active:scale-95"
          >
            选择角色
          </button>
        </header>

        <section className="mb-4 rounded-[8px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-4">
            <div className="h-20 w-16 flex-shrink-0 overflow-hidden rounded-[8px] border border-gray-200 bg-gray-100">
              {featured && (
                <PixelAvatar
                  characterId={featured.character.id}
                  emotion={featured.relationship?.currentEmotion ?? 'neutral'}
                  name={featured.character.name}
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-gray-950">
                  {hasStarted ? '继续上一段对话' : '从一个真实的人开始'}
                </h2>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {hasStarted ? '进行中' : '新会话'}
                </span>
              </div>

              {featured && (
                <>
                  <p className="mt-1 text-sm font-medium text-gray-700">{featured.character.nickname}</p>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-500">
                    {featured.character.signature || featured.character.background}
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={handleContinue}
                      className="min-w-[104px] whitespace-nowrap rounded-[8px] bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 active:scale-95"
                    >
                      开始对话
                    </button>
                    <span className="text-xs text-gray-500">
                      信任度 {(featured.relationship?.trustLevel ?? 25).toFixed(0)}%
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="mb-4 grid grid-cols-3 gap-2">
          {[
            ['角色', characters.length.toString(), '可探索'],
            ['进度', hasStarted ? '继续' : '未开始', hasStarted ? '回到对话' : '选择对象'],
            ['模式', '练习', '自然对话'],
          ].map(([label, value, hint]) => (
            <div key={label} className="rounded-[8px] border border-gray-200 bg-white px-3 py-3 shadow-sm">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="mt-1 text-base font-bold text-gray-950">{value}</p>
              <p className="mt-0.5 text-xs text-gray-400">{hint}</p>
            </div>
          ))}
        </section>

        <section className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">对话对象</h2>
            <button
              onClick={() => navigate('/characters')}
              className="text-xs font-semibold text-gray-500 transition hover:text-gray-900"
            >
              查看全部
            </button>
          </div>
          <div className="space-y-2">
            {activeRelationships.slice(0, 3).map(({ character, relationship }) => {
              const messageCount = relationship?.conversationHistory.length ?? 0;
              const trustLevel = relationship?.trustLevel ?? 25;

              return (
                <button
                  key={character.id}
                  onClick={() => handleSelect(character.id)}
                  className="flex w-full items-center gap-3 rounded-[8px] border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:border-gray-300 hover:bg-gray-50 active:scale-[0.99]"
                >
                  <div className="h-14 w-11 flex-shrink-0 overflow-hidden rounded-[6px] bg-gray-100">
                    <PixelAvatar
                      characterId={character.id}
                      emotion={relationship?.currentEmotion ?? 'neutral'}
                      name={character.name}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-bold text-gray-950">{character.nickname}</p>
                      <span className="text-xs text-gray-400">{trustLevel.toFixed(0)}%</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {messageCount > 0 ? `${messageCount} 条对话记录` : '等待你开启关系'}
                    </p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-100">
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
        </section>

        <section className="mb-6 rounded-[8px] border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">今日练习</h2>
            <span className="text-xs text-gray-400">轻量提示</span>
          </div>
          <div className="space-y-3">
            {tips.slice(0, 3).map((tip) => (
              <div key={tip.id} className="border-t border-gray-100 pt-3 first:border-t-0 first:pt-0">
                <div className="flex items-center gap-2">
                  <span className="text-base">{tip.icon}</span>
                  <p className="text-sm font-semibold text-gray-900">{tip.title}</p>
                </div>
                <p className="mt-1 text-xs leading-5 text-gray-500">{tip.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
