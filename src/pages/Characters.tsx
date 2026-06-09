import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import characters from '../data/characters';
import { useGameStore } from '../store/gameStore';
import PixelAvatar from '../components/PixelAvatar';

const Characters: React.FC = () => {
  const navigate = useNavigate();
  const { relationships, currentCharacterId, setCurrentCharacter } = useGameStore();
  const [selectedCharacterId, setSelectedCharacterId] = useState(() => currentCharacterId ?? characters[0]?.id);

  const selectedCharacter = characters.find((character) => character.id === selectedCharacterId) ?? characters[0];
  const selectedRelationship = selectedCharacter ? relationships[selectedCharacter.id] : undefined;
  const selectedTrust = selectedRelationship?.trustLevel ?? 25;
  const selectedMessages = selectedRelationship?.conversationHistory.length ?? 0;

  const handleStart = () => {
    if (!selectedCharacter) return;
    setCurrentCharacter(selectedCharacter.id);
    navigate('/chat');
  };

  return (
    <div className="min-h-screen bg-[#eef3ed] text-[#1f3128]">
      <header className="border-b border-[#d9e4dc] bg-[#fbfdf8]/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          <button
            onClick={() => navigate('/')}
            className="flex-shrink-0 rounded-full border border-[#d9e4dc] bg-white px-3 py-1.5 text-sm font-bold text-[#1f3128] transition hover:border-[#b8cbbb] active:scale-95"
          >
            返回
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-black leading-tight">选择练习对象</h1>
            <p className="truncate text-xs font-semibold text-[#66756b]">先预览，再开始对话</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        {selectedCharacter && (
          <section className="mb-4 rounded-[24px] bg-white p-4 shadow-sm">
            <div className="rounded-[20px] bg-[#dce9df] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-[#4f735f]">selected relation</p>
                  <h2 className="mt-2 text-2xl font-black leading-tight">{selectedCharacter.nickname}</h2>
                </div>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black">
                  {selectedMessages > 0 ? '继续' : '新会话'}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-[80px_1fr] gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-[18px] bg-white">
                  <PixelAvatar
                    characterId={selectedCharacter.id}
                    emotion={selectedRelationship?.currentEmotion ?? 'neutral'}
                    name={selectedCharacter.name}
                    framing="face"
                  />
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-semibold leading-6 text-[#66756b]">
                    {selectedCharacter.signature || selectedCharacter.background}
                  </p>
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs font-black text-[#66756b]">
                      <span>Trust</span>
                      <span>{selectedTrust.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/80">
                      <div
                        className="h-full rounded-full bg-[#4f735f] transition-all"
                        style={{ width: `${selectedTrust}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleStart}
              className="mt-4 w-full rounded-full bg-[#1f3128] px-5 py-3 text-sm font-black text-white transition hover:bg-[#2d4538] active:scale-[0.99]"
            >
              {selectedMessages > 0 ? '继续对话' : '开始对话'}
            </button>
          </section>
        )}

        <section className="rounded-[24px] bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between px-1">
            <h3 className="text-sm font-black">对象列表</h3>
            <span className="text-xs font-bold text-[#66756b]">点击只选择</span>
          </div>
          <div className="space-y-2">
            {characters.map((character) => {
              const rel = relationships[character.id];
              const trustLevel = rel?.trustLevel ?? 25;
              const messageCount = rel?.conversationHistory.length ?? 0;
              const isSelected = selectedCharacter?.id === character.id;

              return (
                <button
                  key={character.id}
                  onClick={() => setSelectedCharacterId(character.id)}
                  className={`flex w-full items-center gap-3 rounded-[18px] border p-3 text-left transition active:scale-[0.99] ${
                    isSelected
                      ? 'border-[#1f3128] bg-[#1f3128] text-white'
                      : 'border-[#eef3ed] bg-[#fbfdf8] text-[#1f3128] hover:border-[#d9e4dc]'
                  }`}
                >
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-[14px] bg-white">
                    <PixelAvatar
                      characterId={character.id}
                      emotion={rel?.currentEmotion ?? 'neutral'}
                      name={character.name}
                      framing="face"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-black">{character.nickname}</span>
                      <span className={`text-xs font-black ${isSelected ? 'text-white/60' : 'text-[#66756b]'}`}>
                        {trustLevel.toFixed(0)}%
                      </span>
                    </div>
                    <p className={`mt-1 truncate text-xs font-semibold ${isSelected ? 'text-white/60' : 'text-[#66756b]'}`}>
                      {messageCount > 0 ? `${messageCount} 条对话记录` : '等待你开启关系'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Characters;
