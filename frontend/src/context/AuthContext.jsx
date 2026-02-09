/**
 * Auth context: holds user + token, login/logout, loading state.
 * Session timeout: 8 hours; on 401 or token expiry we clear auth and show session-expired message.
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import * as api from '../services/api.js';

const AuthContext = createContext(null);

/** Get JWT exp in ms (client-side decode only). */
function getJwtExpMs(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

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
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState(null);
  const sessionCheckRef = useRef(null);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);
    setSessionExpiredMessage(null);
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
    setSessionExpiredMessage(null);
  }, []);

  useEffect(() => {
    const onSessionExpired = (e) => {
      const message = e.detail?.message || 'Session expired after 8 hours. Please sign in again.';
      setSessionExpiredMessage(message);
      setUser(null);
    };
    window.addEventListener('session-expired', onSessionExpired);
    return () => window.removeEventListener('session-expired', onSessionExpired);
  }, []);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('xvrythng_token');
    const expMs = getJwtExpMs(token);
    if (!expMs) return;

    sessionCheckRef.current = setInterval(() => {
      if (Date.now() >= expMs) {
        window.dispatchEvent(
          new CustomEvent('session-expired', {
            detail: { message: 'Session expired after 8 hours. Please sign in again.' },
          })
        );
      }
    }, 60 * 1000);

    return () => {
      if (sessionCheckRef.current) clearInterval(sessionCheckRef.current);
    };
  }, [user]);

  const value = {
    user,
    loading,
    error,
    sessionExpiredMessage,
    clearSessionExpiredMessage: useCallback(() => setSessionExpiredMessage(null), []),
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

const SidebarContext = createContext();
export function SidebarProvider({ children }) {
  const [sidebarVersion, setSidebarVersion] = useState(0);
  const bumpSidebar = () => setSidebarVersion(v => v + 1);
  return (
    <SidebarContext.Provider value={{ sidebarVersion, bumpSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}
export function useSidebar() { return useContext(SidebarContext); }