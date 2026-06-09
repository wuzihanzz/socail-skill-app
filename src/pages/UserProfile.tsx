import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { getProfileFactLabel } from '../engine/userProfileEngine';
import type { ProfileFact, ProfileFactType } from '../types/index';

const factTypes: Array<{ type: ProfileFactType; label: string }> = [
  { type: 'displayName', label: '名字' },
  { type: 'gender', label: '性别' },
  { type: 'preferredAddress', label: '希望的称呼' },
  { type: 'hobby', label: '爱好' },
  { type: 'occupationOrStudy', label: '职业/学习' },
  { type: 'communicationPreference', label: '沟通偏好' },
  { type: 'sensitiveBoundary', label: '雷区' },
];

const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  const {
    session,
    userProfile,
    upsertUserProfileFact,
    deleteUserProfileFact,
    confirmUserProfileFact,
  } = useGameStore();
  const [type, setType] = useState<ProfileFactType>('hobby');
  const [value, setValue] = useState('');
  const [editingFact, setEditingFact] = useState<ProfileFact | null>(null);

  if (session?.mode === 'guest') {
    return (
      <div className="min-h-screen bg-[#eef3ed] px-4 py-8 text-[#1f3128]">
        <main className="mx-auto max-w-2xl rounded-[24px] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-[#4f735f]">guest mode</p>
          <h1 className="mt-2 text-2xl font-black">游客模式不会保存画像</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#66756b]">
            你可以继续体验聊天，但系统不会长期保存你的名字、爱好或关系记忆。
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-5 rounded-full bg-[#1f3128] px-5 py-2.5 text-sm font-black text-white"
          >
            返回首页
          </button>
        </main>
      </div>
    );
  }

  const facts = userProfile?.facts ?? [];

  const handleSubmit = () => {
    if (!value.trim()) return;
    upsertUserProfileFact(type, value, editingFact?.id);
    setValue('');
    setEditingFact(null);
    setType('hobby');
  };

  const handleEdit = (fact: ProfileFact) => {
    setEditingFact(fact);
    setType(fact.type);
    setValue(fact.value);
  };

  return (
    <div className="min-h-screen bg-[#eef3ed] text-[#1f3128]">
      <header className="border-b border-[#d9e4dc] bg-[#fbfdf8]/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          <button
            onClick={() => navigate('/')}
            className="rounded-full border border-[#d9e4dc] bg-white px-3 py-1.5 text-sm font-bold"
          >
            返回
          </button>
          <div>
            <h1 className="font-black">我的画像</h1>
            <p className="text-xs font-semibold text-[#66756b]">你可以校正 AI 对你的理解</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5 sm:px-6">
        <section className="rounded-[24px] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-black">新增或修改</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr]">
            <select
              value={type}
              onChange={(event) => setType(event.target.value as ProfileFactType)}
              className="rounded-[16px] border border-[#d9e4dc] bg-[#fbfdf8] px-3 py-2 text-sm font-bold outline-none"
            >
              {factTypes.map((item) => (
                <option key={item.type} value={item.type}>
                  {item.label}
                </option>
              ))}
            </select>
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="例如：喜欢摄影、希望别人直接提醒我"
              className="rounded-[16px] border border-[#d9e4dc] bg-[#fbfdf8] px-3 py-2 text-sm font-bold outline-none"
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            {editingFact && (
              <button
                onClick={() => {
                  setEditingFact(null);
                  setValue('');
                  setType('hobby');
                }}
                className="rounded-full bg-[#eef3ed] px-4 py-2 text-xs font-black text-[#66756b]"
              >
                取消编辑
              </button>
            )}
            <button
              onClick={handleSubmit}
              className="rounded-full bg-[#1f3128] px-4 py-2 text-xs font-black text-white"
            >
              {editingFact ? '保存修改' : '加入画像'}
            </button>
          </div>
        </section>

        <section className="rounded-[24px] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black">系统已经理解的你</h2>
            <span className="text-xs font-bold text-[#8b968f]">{facts.length} 条</span>
          </div>

          {facts.length > 0 ? (
            <div className="space-y-2">
              {facts.map((fact) => (
                <div key={fact.id} className="rounded-[18px] bg-[#fbfdf8] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-[#4f735f]">
                        {getProfileFactLabel(fact.type)}
                        <span className="ml-2 text-[#8b968f]">
                          {fact.userConfirmed ? '已确认' : '待确认'}
                        </span>
                      </p>
                      <p className="mt-1 text-sm font-black leading-6">{fact.value}</p>
                    </div>
                    <div className="flex flex-shrink-0 gap-1">
                      {!fact.userConfirmed && (
                        <button
                          onClick={() => confirmUserProfileFact(fact.id)}
                          className="rounded-full bg-[#dce9df] px-2.5 py-1 text-xs font-black text-[#4f735f]"
                        >
                          确认
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(fact)}
                        className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-[#66756b]"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => deleteUserProfileFact(fact.id)}
                        className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-[#b25b4f]"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-[18px] bg-[#fbfdf8] px-4 py-6 text-center text-sm font-semibold text-[#66756b]">
              还没有形成用户画像。你可以在聊天里自然提到名字、爱好或希望被怎样称呼。
            </p>
          )}
        </section>
      </main>
    </div>
  );
};

export default UserProfile;

