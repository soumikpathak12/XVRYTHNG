/**
 * Auth context: holds user + token, login/logout, loading state.
 * Token stored in localStorage for now; ready for offline sync later.
 */
import { createContext, useContext, useState, useCallback } from 'react';
import * as api from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('xvrythng_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.login(credentials);
      if (!data.success || !data.token || !data.user) {
        throw new Error(data.message || 'Invalid response');
      }
      api.setAuthToken(data.token);
      localStorage.setItem('xvrythng_user', JSON.stringify(data.user));
      setUser(data.user);
      return data;
    } catch (err) {
      const message = err.message || 'Sign in failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    api.setAuthToken(null);
    localStorage.removeItem('xvrythng_user');
    setUser(null);
    setError(null);
  }, []);

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
