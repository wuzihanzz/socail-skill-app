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
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-4">
        <p className="text-gray-500 text-sm">请先选择一个人物</p>
        <button onClick={() => navigate('/characters')} className="text-purple-600 text-sm font-medium">
          返回选择人物
        </button>
      </div>
    );
  }

  const character = characters.find((c) => c.id === currentCharacterId);
  const relationship = relationships[currentCharacterId];

  if (!character || !relationship) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-4">
        <p className="text-gray-500 text-sm">人物信息不存在</p>
        <button onClick={() => navigate('/chat')} className="text-purple-600 text-sm font-medium">返回聊天</button>
      </div>
    );
  }

  const askedAbout = relationship.askedAbout ?? { name: false, age: false, job: false, mbti: false, zodiac: false };
  const unlockedSkills = getUnlockedSkills(character, relationship.trustLevel, relationship.unlockedSkills);
  const trustLevel = relationship.trustLevel;
  const trustLabel = trustLevel < 30 ? '陌生人' : trustLevel < 50 ? '认识' : trustLevel < 70 ? '信任' : '非常信任';

  const infoRows = [
    { label: '年龄', unlocked: askedAbout.age, value: String(character.age) },
    { label: '职业', unlocked: askedAbout.job, value: character.job },
    { label: '星座', unlocked: askedAbout.zodiac, value: character.zodiac },
    { label: 'MBTI', unlocked: askedAbout.mbti, value: character.mbti },
  ];

  return (
    <div className="min-h-screen bg-gray-50 max-w-2xl mx-auto w-full">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/chat')} className="text-purple-600 text-sm font-medium px-2 py-1 rounded-lg hover:bg-purple-50 active:scale-95 transition-all">
          ← 返回
        </button>
        <h1 className="font-bold text-gray-900">个人档案</h1>
      </header>

      <main className="px-4 py-5 space-y-4">
        {/* Identity card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="flex-shrink-0 w-16 h-20 bg-gradient-to-b from-gray-100 to-gray-200 rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center">
            <PixelAvatar characterId={character.id} emotion={relationship.currentEmotion} name={character.name} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-900 text-base">{character.nickname}</div>
            <div className="text-xs text-gray-400 italic truncate mb-2">{character.signature}</div>
            <p className="text-xs text-gray-500">
              真名：{askedAbout.name
                ? <span className="text-gray-900 font-medium">{character.name}</span>
                : <span className="tracking-widest text-gray-300">●●●●</span>}
            </p>
          </div>
        </div>

        {/* Trust */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">关系状态</h3>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${trustLevel}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-purple-600 flex-shrink-0">{trustLevel.toFixed(2)}%</span>
          </div>
          <p className="text-xs text-gray-400 text-right">{trustLabel}</p>
        </div>

        {/* Basic info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">基本信息</h3>
          <div className="grid grid-cols-2 gap-3">
            {infoRows.map(({ label, unlocked, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-400">{label}</span>
                {unlocked
                  ? <span className="text-sm font-medium text-gray-900">{value}</span>
                  : <span className="text-sm tracking-widest text-gray-200 font-bold">●●●</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Unlocked traits */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            已了解的特质 ({unlockedSkills.length}/{character.skills.length})
          </h3>
          {unlockedSkills.length > 0 ? (
            <div className="space-y-2">
              {unlockedSkills.map((skill) => (
                <div key={skill.id} className="bg-gray-50 rounded-xl p-3 border-l-2 border-purple-400">
                  <div className="text-sm font-semibold text-gray-800 mb-0.5">{skill.name}</div>
                  <div className="text-xs text-gray-500 leading-relaxed">{skill.description}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-300 italic">还没有了解这个人的特点呢</p>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">我的笔记</h3>
            {!editingNotes && (
              <button
                onClick={() => { setNotes(relationship.userNotes ?? ''); setEditingNotes(true); }}
                className="text-xs text-purple-600 font-medium px-2 py-1 rounded-lg hover:bg-purple-50 active:scale-95 transition-all"
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
                placeholder="记录你对这个人的了解…"
                rows={5}
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setEditingNotes(false)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={() => { updateUserNotes(currentCharacterId, notes); setEditingNotes(false); }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 active:scale-95 transition-all"
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            <p className={`text-sm leading-relaxed ${relationship.userNotes ? 'text-gray-700' : 'text-gray-300 italic'}`}>
              {relationship.userNotes || '还没有笔记'}
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;
