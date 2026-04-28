// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, saveAuth, clearAuth, getToken, getUser } from '../utils/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => getUser());
  const [token, setToken]     = useState(() => getToken());
  const [loading, setLoading] = useState(true);  // true while we verify the stored token

  // On mount: if we have a stored token, verify it's still valid by hitting /auth/me/
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    authAPI.me()
      .then(me => setUser(me))
      .catch(() => {
        // Token is dead – clear everything so the user goes to login
        clearAuth();
        setUser(null);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (username, password) => {
    const data = await authAPI.login(username, password);
    // data = { access, refresh, user }
    saveAuth(data.access, data.refresh, data.user);
    setToken(data.access);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) await authAPI.logout(refresh);
    } catch {
      // ignore errors – we're logging out regardless
    } finally {
      clearAuth();
      setUser(null);
      setToken(null);
    }
  }, []);

  const value = { user, token, loading, login, logout, isAuthenticated: !!token && !!user };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Convenience hook
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}