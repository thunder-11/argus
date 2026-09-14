import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { clearSession, readSession, saveSession } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const restore = async () => {
      if (!readSession().accessToken) { setLoading(false); return; }
      try {
        const response = await api.get('/api/v1/auth/me');
        if (active) setUser(response.data);
      } catch {
        clearSession();
      } finally {
        if (active) setLoading(false);
      }
    };
    restore();
    return () => { active = false; };
  }, []);

  // Listen for 401 events from the API interceptor — navigate without hard reload
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      navigate('/login', { replace: true });
    };
    window.addEventListener('cfas:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('cfas:unauthorized', handleUnauthorized);
  }, [navigate]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/api/v1/auth/login', { email, password });
    const { user: userData } = res.data;
    saveSession(res.data);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/api/v1/auth/logout'); } catch { /* local sign-out still applies */ }
    clearSession();
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
