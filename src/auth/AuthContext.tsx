import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ConsoleUser,
  DEFAULT_USER,
  clearSession,
  loadSession,
  loginWithPassword,
  refreshSession,
  tokenStore,
} from './session';

export const DEFAULT_PASSWORD = 'testpass';

interface AuthContextValue {
  user: ConsoleUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginAs: (username: string) => Promise<void>;
  logout: () => Promise<void>;
  roles: string[];
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ConsoleUser | null>(null);
  const [loading, setLoading] = useState(true);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    let active = true;
    const apply = (u: ConsoleUser | null) => {
      if (!active) return;
      setUser(u);
      tokenStore.set(u?.access_token ?? null);
    };

    const stored = loadSession();
    if (stored) {
      apply(stored);
      setLoading(false);
      return;
    }

    loginWithPassword(DEFAULT_USER, DEFAULT_PASSWORD)
      .then((u) => {
        apply(u);
        setLoading(false);
      })
      .catch(() => {
        apply(null);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const u = await loginWithPassword(username, password);
    tokenStore.set(u.access_token);
    setUser(u);
  }, []);

  const loginAs = useCallback(
    async (username: string) => {
      const u = await loginWithPassword(username, DEFAULT_PASSWORD);
      tokenStore.set(u.access_token);
      setUser(u);
    },
    [],
  );

  const logout = useCallback(async () => {
    clearSession();
    tokenStore.set(null);
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    login,
    loginAs,
    logout,
    roles: user?.roles ?? [],
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { refreshSession };
