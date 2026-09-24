import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import client from '../api/client';

interface User {
  id: string;
  email: string;
  displayName: string | null;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await client.get('/api/v1/auth/me');
      if (res.data.ok) {
        setUser(res.data.data.user);
      }
    } catch {
      setUser(null);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await client.post('/api/v1/auth/login', { email, password });
    if (res.data.ok) {
      setUser(res.data.data.user);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    const res = await client.post('/api/v1/auth/register', { email, password, displayName });
    if (res.data.ok) {
      setUser(res.data.data.user);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await client.post('/api/v1/auth/logout');
    } catch {
      // Ignore errors during logout
    }
    setUser(null);
  }, []);

  // Check auth state on mount
  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
