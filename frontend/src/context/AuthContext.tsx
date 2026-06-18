import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User, LoginResponse } from '@shared/types';
import { ROUTES } from '@shared/api';
import { api, setAuthToken, getAuthToken } from '../api/client';

export interface AuthUser extends User {
  displayName?: string;
  role?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Validate token on mount
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    api.get<AuthUser>(ROUTES.AUTH.ME)
      .then((res) => {
        setUser(res);
      })
      .catch(() => {
        setAuthToken(null);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post<LoginResponse>(ROUTES.AUTH.LOGIN, { username, password });
    setAuthToken(res.token);
    setUser(res.user as AuthUser);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    navigate('/login');
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
