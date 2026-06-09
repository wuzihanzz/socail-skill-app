import { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Characters from './pages/Characters';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import { useGameStore } from './store/gameStore';
import './App.css';

function App() {
  const initialized = useRef(false);
  const session = useGameStore((state) => state.session);
  const isHydrating = useGameStore((state) => state.isHydrating);
  const hydrationError = useGameStore((state) => state.hydrationError);
  const initializeSession = useGameStore((state) => state.initializeSession);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void initializeSession();
  }, [initializeSession]);

  if (isHydrating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef3ed] px-5 text-[#1f3128]">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-pulse rounded-full bg-[#4f735f]" />
          <p className="mt-4 text-sm font-black">正在找回你们的关系记忆</p>
        </div>
      </div>
    );
  }

  if (hydrationError || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef3ed] px-5 text-[#1f3128]">
        <main className="w-full max-w-md rounded-[24px] bg-white p-6 text-center shadow-sm">
          <p className="text-xs font-black uppercase text-[#4f735f]">connection paused</p>
          <h1 className="mt-2 text-2xl font-black">暂时没能认出你</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#66756b]">
            {hydrationError ?? '身份服务暂时不可用，请稍后再试。'}
          </p>
          <button
            type="button"
            onClick={() => void initializeSession()}
            className="mt-5 rounded-full bg-[#1f3128] px-5 py-2.5 text-sm font-black text-white"
          >
            重新连接
          </button>
        </main>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/characters" element={<Characters />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/me" element={<UserProfile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
