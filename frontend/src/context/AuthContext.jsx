// src/context/AuthContext.jsx
/**
 * Auth context: holds user + token, login/logout, loading state.
 * Session timeout: 8 hours; on 401 or token expiry we clear auth and show session-expired message.
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import * as api from '../services/api.js';

const AuthContext = createContext(null);

const TOKEN_KEY = 'xvrythng_token';
const USER_KEY = 'xvrythng_user';
const CUSTOMER_USER_KEY = 'xvrythng_customer_user';
const PERMISSIONS_KEY = 'xvrythng_permissions';

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

function safeParse(json, fallback = null) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function loadStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? safeParse(raw, null) : null;
}

function loadStoredCustomerUser() {
  const raw = localStorage.getItem(CUSTOMER_USER_KEY);
  return raw ? safeParse(raw, null) : null;
}

function loadStoredPermissions() {
  const raw = localStorage.getItem(PERMISSIONS_KEY);
  const arr = raw ? safeParse(raw, []) : [];
  return Array.isArray(arr) ? arr : [];
}

export function AuthProvider({ children }) {
  // bootstrap token into API client
  const bootToken = localStorage.getItem(TOKEN_KEY);
  if (bootToken) api.setAuthToken(bootToken);

  const [user, setUser] = useState(loadStoredUser);
  const [customerUser, setCustomerUser] = useState(loadStoredCustomerUser);
  const [permissions, setPermissions] = useState(loadStoredPermissions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState(null);
  const sessionCheckRef = useRef(null);

  const setToken = useCallback((token) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      api.setAuthToken(token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      api.setAuthToken(null);
    }
  }, []);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);
    setSessionExpiredMessage(null);
    try {
      const data = await api.login(credentials);
      // Normalize token field name from API
      const token = data?.token || data?.accessToken;
      const apiUser = data?.user;
      if (!data?.success || !token || !apiUser) {
        throw new Error(data?.message || 'Invalid response');
      }

      // Persist token
      setToken(token);

      // Persist user with needsPasswordChange flag carried over
      const nextUser = {
        ...apiUser,
        needsPasswordChange: !!data?.needsPasswordChange,
      };
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      setUser(nextUser);

      // Persist permissions
      const perms = Array.isArray(data?.permissions) ? data.permissions : [];
      setPermissions(perms);
      localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(perms));

      return { ...data, token, user: nextUser, permissions: perms };
    } catch (err) {
      const message = err?.message || 'Sign in failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setToken]);

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PERMISSIONS_KEY);
    setUser(null);
    setPermissions([]);
    setError(null);
    setSessionExpiredMessage(null);
  }, [setToken]);

  const customerLogin = useCallback(async (email, otp) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.customerLoginApi(email, otp);
      if (!data?.success || !data?.user) throw new Error('Invalid login');
      api.setCustomerToken(data.token);
      localStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(data.user));
      setCustomerUser(data.user);
      return data;
    } catch (err) {
      setError(err?.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const customerLogout = useCallback(() => {
    api.setCustomerToken(null);
    localStorage.removeItem(CUSTOMER_USER_KEY);
    setCustomerUser(null);
    setError(null);
  }, []);

  const can = useCallback(
    (resource, action) => {
      const slug = `${resource}:${action}`;
      return permissions.includes('*:*') || permissions.includes(slug);
    },
    [permissions]
  );

  const refreshPermissions = useCallback(async () => {
    try {
      const data = await api.getPermissionsMe();
      if (data?.data && Array.isArray(data.data)) {
        setPermissions(data.data);
        localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(data.data));
      }
    } catch {
      // keep current
    }
  }, []);

  // Session expired event handler
  useEffect(() => {
    const onSessionExpired = (e) => {
      const message =
        e.detail?.message || 'Session expired after 8 hours. Please sign in again.';
      setSessionExpiredMessage(message);
      setUser(null);
      setToken(null);
    };
    window.addEventListener('session-expired', onSessionExpired);
    return () => window.removeEventListener('session-expired', onSessionExpired);
  }, [setToken]);

  // Token countdown checker
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const expMs = getJwtExpMs(token);
    if (!token || !expMs) return;

    if (sessionCheckRef.current) clearInterval(sessionCheckRef.current);
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

  // Lazy-load permissions on first mount when user exists
  useEffect(() => {
    if (user && permissions.length === 0) {
      api
        .getPermissionsMe()
        .then((data) => {
          if (data?.data && Array.isArray(data.data)) {
            setPermissions(data.data);
            localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(data.data));
          }
        })
        .catch(() => {});
    }
  }, [user, permissions.length]);

  /**
   * Mark that the user has changed password successfully on the server.
   * Call this after a successful POST /api/auth/change-password.
   * This lets your RequirePasswordUpdate gate pass without a full reload.
   */
  const markPasswordChanged = useCallback(() => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, needsPasswordChange: false };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateCurrentUser = useCallback((patch = {}) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = {
    user,
    customerUser,
    permissions,
    can,
    refreshPermissions,
    loading,
    error,
    sessionExpiredMessage,
    clearSessionExpiredMessage: useCallback(() => setSessionExpiredMessage(null), []),
    login,
    logout,
    customerLogin,
    customerLogout,
    markPasswordChanged,
    updateCurrentUser,
    isAuthenticated: !!user,
    isCustomerAuthenticated: !!customerUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Sidebar context (unchanged)
const SidebarContext = createContext();
export function SidebarProvider({ children }) {
  const [sidebarVersion, setSidebarVersion] = useState(0);
  const bumpSidebar = () => setSidebarVersion((v) => v + 1);
  return (
    <SidebarContext.Provider value={{ sidebarVersion, bumpSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}
export function useSidebar() {
  const ctx = useContext(SidebarContext);
  return ctx ?? { sidebarVersion: 0, bumpSidebar: () => {} };
}