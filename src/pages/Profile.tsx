import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import characters from '../data/characters';
import { useGameStore } from '../store/gameStore';
import PixelAvatar from '../components/PixelAvatar';
import { getUnlockedSkills } from '../engine/skillEngine';
import { getRelationshipStage } from '../engine/relationshipMilestones';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { currentCharacterId, relationships, updateUserNotes } = useGameStore();
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');

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
          {[
            ['信任', `${trustLevel.toFixed(0)}%`, trustLabel],
            ['记忆', `${memoryCount}`, '片段'],
            ['了解', `${unlockedSkills.length}/${character.skills.length}`, '特质'],
          ].map(([label, value, hint]) => (
            <div key={label} className="rounded-[18px] bg-white px-3 py-3 shadow-sm">
              <p className="text-xs font-bold text-[#66756b]">{label}</p>
              <p className="mt-1 text-base font-black">{value}</p>
              <p className="mt-0.5 text-xs font-semibold text-[#8b968f]">{hint}</p>
            </div>
          ))}
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
    </div>
  );
};

export default Profile;
