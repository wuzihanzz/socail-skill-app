import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { useGameStore } from '../store/gameStore';

type LoginStep = 'email' | 'code';

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { session, enterGuestMode } = useGameStore();
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (session) navigate('/', { replace: true });
  }, [navigate, session]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const sendCode = async () => {
    const cleanEmail = normalizeEmail(email);
    if (!supabase || !cleanEmail || loading) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: true,
      },
    });

    setLoading(false);
    if (otpError) {
      setError(otpError.message || '验证码发送失败，请稍后重试。');
      return;
    }

    setEmail(cleanEmail);
    setStep('code');
    setCode('');
    setResendSeconds(60);
    setMessage(`验证码已发送到 ${cleanEmail}`);
  };

  const verifyCode = async () => {
    if (!supabase || code.trim().length !== 6 || loading) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: normalizeEmail(email),
      token: code.trim(),
      type: 'email',
    });

    setLoading(false);
    if (verifyError) {
      setError('验证码无效或已过期，请重新输入。');
      return;
    }

    setMessage('登录成功，正在进入。');
  };

  return (
    <div className="min-h-screen bg-[#eef3ed] px-4 py-8 text-[#1f3128]">
      <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-4xl items-center">
        <section className="grid w-full gap-5 rounded-[28px] bg-[#fbfdf8] p-5 shadow-sm md:grid-cols-[1fr_0.86fr] md:p-8">
          <div className="rounded-[24px] bg-[#dce9df] p-6">
            <p className="text-xs font-black uppercase text-[#4f735f]">social practice</p>
            <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
              让关系从一句自然的话开始
            </h1>
            <p className="mt-5 text-sm font-semibold leading-7 text-[#66756b]">
              登录后，你的用户画像、角色关系和长期记忆会绑定到账号，在同一浏览器中持续保留。
            </p>
          </div>

          <div className="rounded-[24px] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black">邮箱验证码登录</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#66756b]">
              不需要设置密码。输入邮箱后，我们会发送一封包含 6 位验证码的邮件。
            </p>

            {!isSupabaseConfigured && (
              <div className="mt-4 rounded-[16px] bg-[#fff4e5] px-4 py-3 text-xs font-bold leading-5 text-[#8a5b1e]">
                邮箱登录尚未配置。请先设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY；游客模式仍可使用。
              </div>
            )}

            {step === 'email' ? (
              <label className="mt-5 block">
                <span className="text-xs font-black text-[#66756b]">邮箱地址</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void sendCode();
                  }}
                  placeholder="name@example.com"
                  className="mt-2 w-full rounded-[16px] border border-[#d9e4dc] bg-[#fbfdf8] px-4 py-3 text-sm font-bold outline-none transition focus:border-[#4f735f] focus:ring-2 focus:ring-[#dce9df]"
                />
              </label>
            ) : (
              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black text-[#66756b]">6 位验证码</span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setCode('');
                      setError(null);
                      setMessage(null);
                    }}
                    className="text-xs font-black text-[#4f735f]"
                  >
                    更换邮箱
                  </button>
                </div>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void verifyCode();
                  }}
                  placeholder="000000"
                  className="mt-2 w-full rounded-[16px] border border-[#d9e4dc] bg-[#fbfdf8] px-4 py-3 text-center text-xl font-black tracking-[0.35em] outline-none transition focus:border-[#4f735f] focus:ring-2 focus:ring-[#dce9df]"
                />
              </div>
            )}

            {error && (
              <p className="mt-3 rounded-[14px] bg-[#fff0ed] px-3 py-2 text-xs font-bold text-[#b25b4f]">
                {error}
              </p>
            )}
            {message && (
              <p className="mt-3 rounded-[14px] bg-[#eef6ef] px-3 py-2 text-xs font-bold text-[#4f735f]">
                {message}
              </p>
            )}

            {step === 'email' ? (
              <button
                type="button"
                onClick={() => void sendCode()}
                disabled={!isSupabaseConfigured || !normalizeEmail(email).includes('@') || loading}
                className="mt-4 w-full rounded-full bg-[#1f3128] px-5 py-3 text-sm font-black text-white transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? '正在发送' : '发送验证码'}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void verifyCode()}
                  disabled={code.length !== 6 || loading}
                  className="mt-4 w-full rounded-full bg-[#1f3128] px-5 py-3 text-sm font-black text-white transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? '正在验证' : '验证并登录'}
                </button>
                <button
                  type="button"
                  onClick={() => void sendCode()}
                  disabled={resendSeconds > 0 || loading}
                  className="mt-2 w-full py-1 text-xs font-black text-[#4f735f] disabled:text-[#9aa69d]"
                >
                  {resendSeconds > 0 ? `${resendSeconds} 秒后可重新发送` : '重新发送验证码'}
                </button>
              </>
            )}

            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-[#e5ece7]" />
              <span className="text-[11px] font-black text-[#9aa69d]">或者</span>
              <span className="h-px flex-1 bg-[#e5ece7]" />
            </div>

            <button
              type="button"
              onClick={enterGuestMode}
              className="w-full rounded-full border border-[#d9e4dc] bg-white px-5 py-3 text-sm font-black text-[#1f3128] transition active:scale-[0.99]"
            >
              游客模式快速体验
            </button>

            <p className="mt-3 text-xs font-semibold leading-5 text-[#8b968f]">
              游客模式不会保存用户画像和长期记忆，适合先体验产品。
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Login;
