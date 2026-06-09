import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import characters from '../data/characters';
import { useGameStore } from '../store/gameStore';
import PixelAvatar from '../components/PixelAvatar';

const theme = {
  bg: '#eef3ed',
  shell: '#fbfdf8',
  accent: '#4f735f',
  accentSoft: '#dce9df',
  ink: '#1f3128',
  muted: '#66756b',
  title: '把对话说得更靠近',
  subtitle: '从一句问候、一次倾听、一个道歉开始，慢慢练习让关系往前走一步。',
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { relationships, currentCharacterId, setCurrentCharacter } = useGameStore();
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(() => currentCharacterId);

  const relationshipEntries = characters.map((character) => ({
    character,
    relationship: relationships[character.id],
  }));

  const featured =
    relationshipEntries.find(({ character }) => character.id === selectedCharacterId) ??
    relationshipEntries.find(({ character }) => character.id === currentCharacterId) ??
    relationshipEntries.find(({ relationship }) => (relationship?.conversationHistory.length ?? 0) > 0) ??
    relationshipEntries[0];

  const hasStarted = relationshipEntries.some(
    ({ relationship }) => (relationship?.conversationHistory.length ?? 0) > 0
  );
  const featuredTrust = featured?.relationship?.trustLevel ?? 25;
  const featuredMessages = featured?.relationship?.conversationHistory.length ?? 0;
  const featuredStatus = featuredMessages > 0 ? '继续这段关系' : '等待第一句话';

  const handleStart = () => {
    if (!featured) return;
    setCurrentCharacter(featured.character.id);
    navigate('/chat');
  };

  return (
    <div className="min-h-screen text-gray-950" style={{ backgroundColor: theme.bg }}>
      <main
        className="mx-auto min-h-screen w-full max-w-6xl px-4 py-5 sm:px-8 sm:py-8 lg:px-10"
        style={{ backgroundColor: theme.shell }}
      >
        <header className="mb-7 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-black text-white"
              style={{ backgroundColor: theme.ink }}
            >
              *
            </span>
            <span className="text-sm font-black" style={{ color: theme.ink }}>关系练习室</span>
          </div>
          <button
            onClick={() => navigate('/me', { state: { returnTo: '/' } })}
            className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-black"
            style={{ color: theme.ink }}
          >
            我的画像
          </button>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1fr_0.92fr] lg:items-stretch">
          <div className="rounded-[28px] border border-black/5 bg-white/75 p-5 shadow-sm sm:p-7 lg:p-8">
            <div
              className="mb-8 inline-flex items-center gap-2 rounded-full px-3 py-1.5"
              style={{ backgroundColor: theme.accentSoft, color: theme.accent }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.accent }} />
              <span className="text-xs font-black uppercase">daily practice</span>
            </div>

            <h1 className="max-w-2xl text-[42px] font-black leading-[1.02] sm:text-[70px] lg:text-[84px]" style={{ color: theme.ink }}>
              {theme.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base font-semibold leading-7 sm:text-lg" style={{ color: theme.muted }}>
              {theme.subtitle}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                onClick={handleStart}
                className="rounded-full px-6 py-3 text-sm font-black text-white transition active:scale-95"
                style={{ backgroundColor: theme.ink }}
              >
                {hasStarted ? '继续对话' : '开始练习'}
              </button>
              <span className="text-sm font-bold" style={{ color: theme.muted }}>
                当前对象：{featured?.character.nickname ?? '未选择'}
              </span>
            </div>
          </div>

          {featured && (
            <div className="flex flex-col rounded-[28px] border border-black/5 bg-white p-4 shadow-sm sm:p-5">
              <div className="rounded-[22px] p-4" style={{ backgroundColor: theme.accentSoft }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase" style={{ color: theme.accent }}>selected relation</p>
                    <h2 className="mt-2 text-3xl font-black leading-tight" style={{ color: theme.ink }}>
                      {featured.character.nickname}
                    </h2>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black" style={{ color: theme.ink }}>
                    {featuredMessages > 0 ? '进行中' : '新会话'}
                  </span>
                </div>

                <div className="mt-5 border-t border-black/5 pt-4">
                  <p className="line-clamp-2 text-sm font-semibold leading-6" style={{ color: theme.muted }}>
                    {featured.character.signature || featured.character.background}
                  </p>
                  <p className="mt-2 text-xs font-black uppercase" style={{ color: theme.accent }}>
                    {featuredStatus}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs font-black" style={{ color: theme.muted }}>
                  <span>Trust</span>
                  <span>{featuredTrust.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${featuredTrust}%`, backgroundColor: theme.accent }}
                  />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {relationshipEntries.map(({ character, relationship }) => {
                  const isSelected = featured.character.id === character.id;
                  return (
                    <button
                      key={character.id}
                      onClick={() => setSelectedCharacterId(character.id)}
                      className="rounded-[18px] border p-2.5 text-left transition active:scale-[0.98]"
                      style={{
                        backgroundColor: isSelected ? theme.ink : theme.shell,
                        borderColor: isSelected ? theme.ink : 'rgba(0,0,0,0.06)',
                        color: isSelected ? '#fff' : theme.ink,
                      }}
                    >
                      <div className="mx-auto h-14 w-14 overflow-hidden rounded-[12px] bg-white">
                        <PixelAvatar
                          characterId={character.id}
                          emotion={relationship?.currentEmotion ?? 'neutral'}
                          name={character.name}
                          framing="face"
                        />
                      </div>
                      <p className="mt-2 truncate text-center text-[10px] font-black">{character.nickname}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="mt-5 rounded-[24px] bg-white/75 p-5 shadow-sm">
            <p className="text-xs font-black uppercase" style={{ color: theme.accent }}>next step</p>
            <h2 className="mt-4 text-2xl font-black leading-8" style={{ color: theme.ink }}>
              {featuredMessages > 0 ? '回到上一段关系里' : '先说一句自然的话'}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6" style={{ color: theme.muted }}>
              这里不是评分面板，而是一个可以慢慢试错的关系练习空间。
            </p>
        </section>
      </main>
    </div>
  );
};

export default Home;
