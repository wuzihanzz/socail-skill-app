import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import characters from '../data/characters';
import { useGameStore } from '../store/gameStore';
import PixelAvatar from '../components/PixelAvatar';
import { getUnlockedSkills } from '../engine/skillEngine';
import { getRelationshipStage } from '../engine/relationshipMilestones';
import type { MemoryDiaryEntry } from '../types/index';

const formatMemoryDate = (timestamp: number): string =>
  new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));

const toFirstPersonMemory = (entry: MemoryDiaryEntry, nickname: string): string =>
  entry.content
    .replaceAll(`${nickname}和用户的一次互动让关系`, '今天和你聊完以后，我感觉我们的关系')
    .replaceAll('用户说', '你说')
    .replaceAll('更亲近', '更近')
    .replaceAll('更疏远', '远了一点');

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { currentCharacterId, relationships, updateUserNotes } = useGameStore();
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [memoryModalStep, setMemoryModalStep] = useState<'confirm' | 'timeline' | null>(null);

  if (!currentCharacterId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#eef3ed] p-4">
        <p className="text-sm font-semibold text-[#66756b]">请先选择一个角色</p>
        <button onClick={() => navigate('/characters')} className="text-sm font-black text-[#1f3128]">
          返回选择
        </button>
      </div>
    );
  }

  const character = characters.find((c) => c.id === currentCharacterId);
  const relationship = relationships[currentCharacterId];

  if (!character || !relationship) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#eef3ed] p-4">
        <p className="text-sm font-semibold text-[#66756b]">角色信息不存在</p>
        <button onClick={() => navigate('/chat')} className="text-sm font-black text-[#1f3128]">
          返回聊天
        </button>
      </div>
    );
  }

  const askedAbout = relationship.askedAbout ?? { name: false, age: false, job: false, mbti: false, zodiac: false };
  const unlockedSkills = getUnlockedSkills(character, relationship.trustLevel, relationship.unlockedSkills);
  const trustLevel = relationship.trustLevel;
  const trustLabel = getRelationshipStage(trustLevel).label;
  const memoryCount = Object.values(relationship.memoryWing?.rooms ?? {}).reduce(
    (sum, room) => sum + room.drawers.length,
    0
  );
  const timelineEntries = relationship.memoryWing?.diary ?? [];

  const infoRows = [
    { label: '年龄', unlocked: askedAbout.age, value: String(character.age) },
    { label: '职业', unlocked: askedAbout.job, value: character.job },
    { label: '星座', unlocked: askedAbout.zodiac, value: character.zodiac },
    { label: 'MBTI', unlocked: askedAbout.mbti, value: character.mbti },
  ];

  return (
    <div className="min-h-screen bg-[#eef3ed] text-[#1f3128]">
      <header className="border-b border-[#d9e4dc] bg-[#fbfdf8]/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          <button
            onClick={() => navigate('/chat')}
            className="rounded-full border border-[#d9e4dc] bg-white px-3 py-1.5 text-sm font-bold text-[#1f3128] transition hover:border-[#b8cbbb] active:scale-95"
          >
            返回
          </button>
          <div>
            <h1 className="font-black">关系档案</h1>
            <p className="text-xs font-semibold text-[#66756b]">随着对话逐步打开</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5 sm:px-6">
        <section className="rounded-[24px] bg-white p-4 shadow-sm">
          <div className="rounded-[20px] bg-[#dce9df] p-4">
            <div className="flex items-start gap-4">
              <div className="h-24 w-20 flex-shrink-0 overflow-hidden rounded-[18px] bg-white">
                <PixelAvatar characterId={character.id} emotion={relationship.currentEmotion} name={character.name} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase text-[#4f735f]">selected relation</p>
                <h2 className="mt-2 text-2xl font-black leading-tight">{character.nickname}</h2>
                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-[#66756b]">{character.signature}</p>
                <p className="mt-3 text-xs font-semibold text-[#66756b]">
                  真名：{askedAbout.name
                    ? <span className="font-black text-[#1f3128]">{character.name}</span>
                    : <span className="tracking-widest text-[#9aa69d]">••••</span>}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-2">
          <div className="rounded-[18px] bg-white px-3 py-3 shadow-sm">
            <p className="text-xs font-bold text-[#66756b]">信任</p>
            <p className="mt-1 text-base font-black">{trustLevel.toFixed(0)}%</p>
            <p className="mt-0.5 text-xs font-semibold text-[#8b968f]">{trustLabel}</p>
          </div>
          <button
            onClick={() => setMemoryModalStep('confirm')}
            className="rounded-[18px] bg-white px-3 py-3 text-left shadow-sm transition hover:bg-[#fbfdf8] active:scale-[0.99]"
          >
            <p className="text-xs font-bold text-[#66756b]">记忆</p>
            <p className="mt-1 text-base font-black">{memoryCount}</p>
            <p className="mt-0.5 text-xs font-semibold text-[#8b968f]">片段</p>
          </button>
          <div className="rounded-[18px] bg-white px-3 py-3 shadow-sm">
            <p className="text-xs font-bold text-[#66756b]">了解</p>
            <p className="mt-1 text-base font-black">{unlockedSkills.length}/{character.skills.length}</p>
            <p className="mt-0.5 text-xs font-semibold text-[#8b968f]">特质</p>
          </div>
        </section>

        <section className="rounded-[22px] bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-black">关系状态</h3>
            <span className="rounded-full bg-[#dce9df] px-3 py-1 text-xs font-black text-[#4f735f]">{trustLabel}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#eef3ed]">
            <div
              className="h-full rounded-full bg-[#4f735f] transition-all duration-500"
              style={{ width: `${trustLevel}%` }}
            />
          </div>
        </section>

        <section className="rounded-[22px] bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-black">基本信息</h3>
          <div className="grid grid-cols-2 gap-3">
            {infoRows.map(({ label, unlocked, value }) => (
              <div key={label} className="rounded-[16px] bg-[#fbfdf8] p-3">
                <span className="text-xs font-bold text-[#66756b]">{label}</span>
                {unlocked
                  ? <span className="mt-1 block text-sm font-black">{value}</span>
                  : <span className="mt-1 block text-sm font-black tracking-widest text-[#b8c3bb]">•••</span>}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[22px] bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-black">已了解的特质</h3>
          {unlockedSkills.length > 0 ? (
            <div className="space-y-2">
              {unlockedSkills.map((skill) => (
                <div key={skill.id} className="rounded-[16px] bg-[#fbfdf8] p-3">
                  <div className="mb-0.5 text-sm font-black">{skill.name}</div>
                  <div className="text-xs font-semibold leading-5 text-[#66756b]">{skill.description}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-[#8b968f]">还没有了解这个人的特点</p>
          )}
        </section>

        <section className="rounded-[22px] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-black">我的笔记</h3>
            {!editingNotes && (
              <button
                onClick={() => { setNotes(relationship.userNotes ?? ''); setEditingNotes(true); }}
                className="rounded-full border border-[#d9e4dc] px-3 py-1 text-xs font-black text-[#1f3128] transition hover:border-[#b8cbbb] active:scale-95"
              >
                编辑
              </button>
            )}
          </div>

          {editingNotes ? (
            <div className="space-y-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="记录你对这个人的观察"
                rows={5}
                className="w-full resize-none rounded-[16px] border border-[#d9e4dc] bg-[#fbfdf8] px-3 py-2 text-sm text-[#1f3128] placeholder-[#8b968f] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#4f735f]"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditingNotes(false)}
                  className="rounded-[14px] bg-[#eef3ed] px-3 py-1.5 text-xs font-black text-[#66756b] transition active:scale-95"
                >
                  取消
                </button>
                <button
                  onClick={() => { updateUserNotes(currentCharacterId, notes); setEditingNotes(false); }}
                  className="rounded-[14px] bg-[#1f3128] px-3 py-1.5 text-xs font-black text-white transition hover:bg-[#2d4538] active:scale-95"
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            <p className={`text-sm leading-6 ${relationship.userNotes ? 'text-[#1f3128]' : 'italic text-[#8b968f]'}`}>
              {relationship.userNotes || '还没有笔记'}
            </p>
          )}
        </section>
      </main>

      {memoryModalStep && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1f3128]/35 px-4 pb-4 pt-12 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-[24px] bg-white p-4 shadow-[0_24px_70px_rgba(31,49,40,0.22)]">
            {memoryModalStep === 'confirm' ? (
              <>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#6f8b76]">关系记忆</p>
                <h3 className="mt-2 text-xl font-black text-[#1f3128]">
                  确定查看{character.nickname}对你的印象吗？
                </h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#66756b]">
                  这里会用{character.nickname}的第一人称记录你们之间留下的互动痕迹。
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setMemoryModalStep(null)}
                    className="flex-1 rounded-[14px] bg-[#eef3ed] px-4 py-2 text-sm font-black text-[#66756b] transition active:scale-95"
                  >
                    先不看
                  </button>
                  <button
                    onClick={() => setMemoryModalStep('timeline')}
                    className="flex-1 rounded-[14px] bg-[#1f3128] px-4 py-2 text-sm font-black text-white transition active:scale-95"
                  >
                    查看印象
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[#6f8b76]">timeline</p>
                    <h3 className="mt-1 text-xl font-black text-[#1f3128]">{character.nickname}对你的印象</h3>
                  </div>
                  <button
                    onClick={() => setMemoryModalStep(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d9e4dc] text-[#66756b]"
                    aria-label="关闭"
                  >
                    ×
                  </button>
                </div>

                {timelineEntries.length > 0 ? (
                  <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
                    {timelineEntries.map((entry) => (
                      <div key={entry.id} className="border-l-2 border-[#dce9df] pl-3">
                        <p className="text-[11px] font-black text-[#8b968f]">{formatMemoryDate(entry.createdAt)}</p>
                        <p className="mt-1 text-sm font-semibold leading-6 text-[#1f3128]">
                          {toFirstPersonMemory(entry, character.nickname)}
                        </p>
                        <p className="mt-1 text-xs font-bold text-[#6f8b76]">信任 {entry.trustLevel.toFixed(0)}%</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[18px] bg-[#fbfdf8] px-4 py-6 text-center">
                    <p className="text-sm font-semibold text-[#66756b]">
                      还没有形成清晰的关系印象。多聊几次后，这里会慢慢长出时间线。
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
