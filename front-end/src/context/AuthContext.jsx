import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { REFRESH_TOKEN_KEY, TOKEN_KEY, USER_KEY, authStorage } from '../services/api.js';

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = authStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(() => authStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(Boolean(authStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY)));

  const persistSession = useCallback((nextUser, nextToken, nextRefreshToken) => {
    authStorage.setItem(TOKEN_KEY, nextToken);
    authStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    if (nextRefreshToken) authStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const clearSession = useCallback(() => {
    authStorage.removeItem(TOKEN_KEY);
    authStorage.removeItem(REFRESH_TOKEN_KEY);
    authStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        if (!mounted) return;
        authStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setUser(data.user);
      } catch {
        if (mounted) clearSession();
      } finally {
        if (mounted) setLoading(false);
      }
    }

    hydrate();

    return () => {
      mounted = false;
    };
  }, [clearSession, token]);

  useEffect(() => {
    function handleExpired() {
      clearSession();
    }

    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, [clearSession]);

  const login = useCallback(
    async (credentials) => {
      const { data } = await api.post('/auth/login', credentials);
      persistSession(data.user, data.token, data.refresh_token);
      return data.user;
    },
    [persistSession]
  );

  const register = useCallback(
    async (payload) => {
      const { data } = await api.post('/auth/register', payload);
      persistSession(data.user, data.token, data.refresh_token);
      return data.user;
    },
    [persistSession]
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', {
        refresh_token: authStorage.getItem(REFRESH_TOKEN_KEY)
      });
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      login,
      register,
      logout
    }),
    [loading, login, logout, register, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
}
