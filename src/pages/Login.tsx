import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';

export const PERSISTENT_ENTRY_KEY = 'social-skill-persistent-entry';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const initializeSession = useGameStore((state) => state.initializeSession);
  const enterGuestMode = useGameStore((state) => state.enterGuestMode);
  const hydrationError = useGameStore((state) => state.hydrationError);
  const [loading, setLoading] = useState(false);

  const enterWithMemory = async () => {
    if (loading) return;
    setLoading(true);
    await initializeSession();
    const session = useGameStore.getState().session;
    if (session?.mode === 'account') {
      localStorage.setItem(PERSISTENT_ENTRY_KEY, 'true');
      navigate('/', { replace: true });
    }
    setLoading(false);
  };

  const enterAsGuest = () => {
    enterGuestMode();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#eef3ed] px-4 py-6 text-[#1f3128] sm:py-10">
      <main className="mx-auto grid min-h-[calc(100vh-48px)] w-full max-w-4xl items-stretch overflow-hidden rounded-[28px] bg-[#fbfdf8] shadow-sm md:min-h-[620px] md:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between bg-[#dce9df] p-7 sm:p-10">
          <div>
            <p className="text-xs font-black uppercase text-[#4f735f]">关系练习室</p>
            <h1 className="mt-5 max-w-md text-4xl font-black leading-[1.12] sm:text-5xl">
              有些关系，
              <br />
              值得慢慢认识
            </h1>
            <p className="mt-6 max-w-sm text-sm font-semibold leading-7 text-[#66756b]">
              选择一个角色，从一句自然的话开始。对方会记得你们聊过的事，也会对你的表达产生真实反应。
            </p>
          </div>

          <p className="mt-10 text-xs font-bold leading-5 text-[#6f8276]">
            你的聊天记录默认只用于维持自己的关系进度。
          </p>
        </section>

        <section className="flex flex-col justify-center p-7 sm:p-10">
          <p className="text-xs font-black uppercase text-[#4f735f]">开始体验</p>
          <h2 className="mt-3 text-2xl font-black">这次，要不要让他们记住你？</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#66756b]">
            不需要邮箱或密码。我们会为当前浏览器创建一个匿名身份。
          </p>

          {hydrationError && (
            <p className="mt-5 rounded-[16px] bg-[#fff0ed] px-4 py-3 text-xs font-bold leading-5 text-[#a65449]">
              {hydrationError}
            </p>
          )}

          <button
            type="button"
            onClick={() => void enterWithMemory()}
            disabled={loading}
            className="mt-7 w-full rounded-full bg-[#1f3128] px-5 py-3.5 text-sm font-black text-white transition enabled:hover:bg-[#2d4538] enabled:active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? '正在找回练习室' : '进入并保存关系记忆'}
          </button>
          <p className="mt-3 text-center text-xs font-semibold leading-5 text-[#7c8b81]">
            画像、关系进度和长期记忆会持续保存
          </p>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#e3ebe5]" />
            <span className="text-[11px] font-black text-[#9aa69d]">或者</span>
            <span className="h-px flex-1 bg-[#e3ebe5]" />
          </div>

          <button
            type="button"
            onClick={enterAsGuest}
            className="w-full rounded-full border border-[#d9e4dc] bg-white px-5 py-3.5 text-sm font-black transition hover:border-[#b8cbbb] active:scale-[0.99]"
          >
            游客模式快速看看
          </button>
          <p className="mt-3 text-center text-xs font-semibold leading-5 text-[#8b968f]">
            关闭当前标签页后，聊天和记忆不会保留
          </p>
        </section>
      </main>
    </div>
  );
};

export default Login;
