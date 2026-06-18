import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';

type AuthMode = 'login' | 'register';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const loginWithPassword = useGameStore((state) => state.loginWithPassword);
  const registerWithPassword = useGameStore((state) => state.registerWithPassword);
  const enterGuestMode = useGameStore((state) => state.enterGuestMode);
  const hydrationError = useGameStore((state) => state.hydrationError);
  const storageMode = useGameStore((state) => state.storageMode);
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const submitAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (mode === 'login') {
        await loginWithPassword(email, password);
      } else {
        await registerWithPassword(email, password, displayName);
      }
      const session = useGameStore.getState().session;
      if (session?.mode === 'account') {
        navigate('/', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  const enterAsGuest = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await enterGuestMode();
      const session = useGameStore.getState().session;
      if (session?.mode === 'guest') {
        navigate('/', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eef3ed] px-4 py-6 text-[#1f3128] sm:py-10">
      <main className="mx-auto grid min-h-[calc(100vh-48px)] w-full max-w-4xl items-stretch overflow-hidden rounded-[28px] bg-[#fbfdf8] shadow-sm md:min-h-[620px] md:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between bg-[#dce9df] p-7 sm:p-10">
          <div>
            <p className="text-xs font-black uppercase text-[#4f735f]">关系练习室</p>
            <h1 className="mt-5 max-w-md text-4xl font-black leading-[1.12] sm:text-5xl">
              把关系记忆
              <br />
              变成你的产品名片
            </h1>
            <p className="mt-6 max-w-sm text-sm font-semibold leading-7 text-[#66756b]">
              登录后保存长期对话、用户画像和角色记忆。后续可以继续接入 RAG、memory 管理和可视化分析。
            </p>
          </div>

          <p className="mt-10 text-xs font-bold leading-5 text-[#6f8276]">
            账号体系会把每一段关系进度绑定到稳定身份，方便展示真实的产品闭环。
          </p>
        </section>

        <section className="flex flex-col justify-center p-7 sm:p-10">
          <div className="mb-5 grid grid-cols-2 rounded-full bg-[#eef3ed] p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`rounded-full px-4 py-2 text-sm font-black transition ${
                mode === 'login' ? 'bg-white text-[#1f3128] shadow-sm' : 'text-[#66756b]'
              }`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`rounded-full px-4 py-2 text-sm font-black transition ${
                mode === 'register' ? 'bg-white text-[#1f3128] shadow-sm' : 'text-[#66756b]'
              }`}
            >
              注册
            </button>
          </div>

          <p className="text-xs font-black uppercase text-[#4f735f]">identity layer</p>
          <h2 className="mt-3 text-2xl font-black">
            {mode === 'login' ? '回到你的关系记忆' : '创建一个可持久化身份'}
          </h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#66756b]">
            {mode === 'login'
              ? '用邮箱和密码找回已有的聊天、画像和记忆。'
              : '注册后，当前浏览器里的匿名进度会迁移到这个账号。'}
          </p>

          {storageMode === 'memory' && (
            <p className="mt-5 rounded-[16px] bg-[#fff8e7] px-4 py-3 text-xs font-bold leading-5 text-[#8a6a1f]">
              当前后端还在使用临时内存存储。配置 Zeabur Postgres 后，账号和记忆才会在服务重启后保留。
            </p>
          )}

          {hydrationError && (
            <p className="mt-5 rounded-[16px] bg-[#fff0ed] px-4 py-3 text-xs font-bold leading-5 text-[#a65449]">
              {hydrationError}
            </p>
          )}

          <form className="mt-6 space-y-3" onSubmit={(event) => void submitAccount(event)}>
            {mode === 'register' && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-black text-[#66756b]">昵称</span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="练习者"
                  className="w-full rounded-[16px] border border-[#d9e4dc] bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-[#4f735f] focus:ring-2 focus:ring-[#dce9df]"
                />
              </label>
            )}
            <label className="block">
              <span className="mb-1.5 block text-xs font-black text-[#66756b]">邮箱</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full rounded-[16px] border border-[#d9e4dc] bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-[#4f735f] focus:ring-2 focus:ring-[#dce9df]"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-black text-[#66756b]">密码</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 8 个字符"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={8}
                className="w-full rounded-[16px] border border-[#d9e4dc] bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-[#4f735f] focus:ring-2 focus:ring-[#dce9df]"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#1f3128] px-5 py-3.5 text-sm font-black text-white transition enabled:hover:bg-[#2d4538] enabled:active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? '正在验证身份' : mode === 'login' ? '进入并保存关系记忆' : '注册并开始保存'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#e3ebe5]" />
            <span className="text-[11px] font-black text-[#9aa69d]">或者</span>
            <span className="h-px flex-1 bg-[#e3ebe5]" />
          </div>

          <button
            type="button"
            onClick={() => void enterAsGuest()}
            disabled={loading}
            className="w-full rounded-full border border-[#d9e4dc] bg-white px-5 py-3.5 text-sm font-black transition hover:border-[#b8cbbb] active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? '正在准备临时身份' : '游客模式快速看看'}
          </button>
          <p className="mt-3 text-center text-xs font-semibold leading-5 text-[#8b968f]">
            游客模式适合快速预览，账号模式才会形成可持续的记忆档案。
          </p>
        </section>
      </main>
    </div>
  );
};

export default Login;
