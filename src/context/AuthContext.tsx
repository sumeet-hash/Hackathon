// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, setToken, removeToken, getToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: any) => Promise<User>;
  logout: () => void;
  quickSwitch: (role: 'admin' | 'staff_sales' | 'staff_finance' | 'customer_acme' | 'customer_globex') => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      if (getToken()) {
        const res = await api.getMe();
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch {
      removeToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (payload: any) => {
    const res = await api.register(payload);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    removeToken();
    setUser(null);
  };

  const quickSwitch = async (target: 'admin' | 'staff_sales' | 'staff_finance' | 'customer_acme' | 'customer_globex') => {
    let email = '';
    let password = '';

    switch (target) {
      case 'admin':
        email = 'admin@brightloop.com';
        password = 'Admin@12345';
        break;
      case 'staff_sales':
        email = 'sarah.sales@brightloop.com';
        password = 'Staff@12345';
        break;
      case 'staff_finance':
        email = 'felix.finance@brightloop.com';
        password = 'Staff@12345';
        break;
      case 'customer_acme':
        email = 'john@acmecorp.com';
        password = 'Customer@12345';
        break;
      case 'customer_globex':
        email = 'tech@globex.com';
        password = 'Customer@12345';
        break;
    }

    await login(email, password);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, quickSwitch, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

