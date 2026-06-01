import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import characters from '../data/characters';
import { useGameStore } from '../store/gameStore';
import PixelAvatar from '../components/PixelAvatar';
import { getUnlockedSkills } from '../engine/skillEngine';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { currentCharacterId, relationships, updateUserNotes } = useGameStore();
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');

  if (!currentCharacterId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f6f5f2] p-4">
        <p className="text-sm text-gray-500">请先选择一个角色</p>
        <button onClick={() => navigate('/characters')} className="text-sm font-semibold text-gray-900">
          返回选择
        </button>
      </div>
    );
  }

  const character = characters.find((c) => c.id === currentCharacterId);
  const relationship = relationships[currentCharacterId];

  if (!character || !relationship) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f6f5f2] p-4">
        <p className="text-sm text-gray-500">角色信息不存在</p>
        <button onClick={() => navigate('/chat')} className="text-sm font-semibold text-gray-900">
          返回聊天
        </button>
      </div>
    );
  }

  const askedAbout = relationship.askedAbout ?? { name: false, age: false, job: false, mbti: false, zodiac: false };
  const unlockedSkills = getUnlockedSkills(character, relationship.trustLevel, relationship.unlockedSkills);
  const trustLevel = relationship.trustLevel;
  const trustLabel = trustLevel < 30 ? '陌生' : trustLevel < 50 ? '认识' : trustLevel < 70 ? '信任' : '深度信任';
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
    <div className="min-h-screen bg-[#f6f5f2] text-gray-950">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          <button
            onClick={() => navigate('/chat')}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 active:scale-95"
          >
            返回
          </button>
          <div>
            <h1 className="font-bold text-gray-950">关系档案</h1>
            <p className="text-xs text-gray-500">随着对话逐步打开</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5 sm:px-6">
        <div className="flex items-center gap-4 rounded-[8px] border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex h-20 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-gray-200 bg-gray-100">
            <PixelAvatar characterId={character.id} emotion={relationship.currentEmotion} name={character.name} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-bold text-gray-950">{character.nickname}</div>
            <div className="mb-2 truncate text-xs text-gray-500">{character.signature}</div>
            <p className="text-xs text-gray-500">
              真名：{askedAbout.name
                ? <span className="font-medium text-gray-900">{character.name}</span>
                : <span className="tracking-widest text-gray-300">••••</span>}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            ['信任', `${trustLevel.toFixed(0)}%`, trustLabel],
            ['记忆', `${memoryCount}`, '片段'],
            ['了解', `${unlockedSkills.length}/${character.skills.length}`, '特质'],
          ].map(([label, value, hint]) => (
            <div key={label} className="rounded-[8px] border border-gray-200 bg-white px-3 py-3 shadow-sm">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="mt-1 text-base font-bold text-gray-950">{value}</p>
              <p className="mt-0.5 text-xs text-gray-400">{hint}</p>
            </div>
          ))}
        </div>

        <div className="rounded-[8px] border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">关系状态</h3>
            <span className="text-xs font-semibold text-emerald-700">{trustLabel}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${trustLevel}%` }}
            />
          </div>
        </div>

        <div className="rounded-[8px] border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-gray-900">基本信息</h3>
          <div className="grid grid-cols-2 gap-3">
            {infoRows.map(({ label, unlocked, value }) => (
              <div key={label} className="rounded-[8px] bg-gray-50 p-3">
                <span className="text-xs text-gray-500">{label}</span>
                {unlocked
                  ? <span className="mt-1 block text-sm font-semibold text-gray-900">{value}</span>
                  : <span className="mt-1 block text-sm font-bold tracking-widest text-gray-300">•••</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[8px] border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-gray-900">已了解的特质</h3>
          {unlockedSkills.length > 0 ? (
            <div className="space-y-2">
              {unlockedSkills.map((skill) => (
                <div key={skill.id} className="rounded-[8px] border border-gray-100 bg-gray-50 p-3">
                  <div className="mb-0.5 text-sm font-semibold text-gray-900">{skill.name}</div>
                  <div className="text-xs leading-5 text-gray-500">{skill.description}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-gray-400">还没有了解这个人的特点</p>
          )}
        </div>

        <div className="rounded-[8px] border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">我的笔记</h3>
            {!editingNotes && (
              <button
                onClick={() => { setNotes(relationship.userNotes ?? ''); setEditingNotes(true); }}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-300 active:scale-95"
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
                className="w-full resize-none rounded-[8px] border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditingNotes(false)}
                  className="rounded-[8px] bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-200 active:scale-95"
                >
                  取消
                </button>
                <button
                  onClick={() => { updateUserNotes(currentCharacterId, notes); setEditingNotes(false); }}
                  className="rounded-[8px] bg-gray-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-800 active:scale-95"
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            <p className={`text-sm leading-6 ${relationship.userNotes ? 'text-gray-700' : 'italic text-gray-400'}`}>
              {relationship.userNotes || '还没有笔记'}
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;
