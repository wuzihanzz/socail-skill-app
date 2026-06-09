import { useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Characters from './pages/Characters';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import Login from './pages/Login';
import UserProfile from './pages/UserProfile';
import { supabase } from './lib/supabase';
import { useGameStore } from './store/gameStore';
import './App.css';

function App() {
  const session = useGameStore((state) => state.session);
  const loginWithAuthenticatedUser = useGameStore((state) => state.loginWithAuthenticatedUser);
  const logout = useGameStore((state) => state.logout);

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const user = data.session?.user;
      if (user?.email) {
        loginWithAuthenticatedUser(
          user.id,
          user.email,
          typeof user.user_metadata?.display_name === 'string'
            ? user.user_metadata.display_name
            : undefined
        );
      } else if (useGameStore.getState().session?.mode === 'account') {
        logout();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const user = nextSession?.user;
      if (user?.email) {
        loginWithAuthenticatedUser(
          user.id,
          user.email,
          typeof user.user_metadata?.display_name === 'string'
            ? user.user_metadata.display_name
            : undefined
        );
      } else if (useGameStore.getState().session?.mode === 'account') {
        logout();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loginWithAuthenticatedUser, logout]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        {session ? (
          <>
            <Route path="/" element={<Home />} />
            <Route path="/characters" element={<Characters />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/me" element={<UserProfile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;
