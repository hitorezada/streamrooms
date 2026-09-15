import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setAccessToken, refreshSession } from "../api/client";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const refreshed = await refreshSession();
      if (refreshed) {
        try {
          const me = await api.get<User>("/auth/me");
          setUser(me);
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (usernameOrEmail: string, password: string) => {
    const data = await api.post<{ accessToken: string; user: User }>("/auth/login", {
      usernameOrEmail,
      password,
    });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    const data = await api.post<{ accessToken: string; user: User }>("/auth/register", {
      username,
      email,
      password,
    });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => {});
    setAccessToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await api.get<User>("/auth/me");
    setUser(me);
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
