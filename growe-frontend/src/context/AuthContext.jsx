import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        api.get('/auth/me').then(({ data }) => {
          setUser(data);
          localStorage.setItem('user', JSON.stringify(data));
        }).catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const onRefresh = (e) => e.detail && setUser(e.detail);
    window.addEventListener('auth-refresh', onRefresh);
    return () => window.removeEventListener('auth-refresh', onRefresh);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const register = async (email, password, roleName) => {
    const { data } = await api.post('/auth/register', { email, password, roleName });
    return data;
  };

  /** Request verification email without being logged in (uses email only). */
  const requestVerificationEmail = async (email) => {
    const { data } = await api.post('/auth/request-verification-email', { email });
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const refreshUser = async () => {
    const { data } = await api.get('/auth/me');
    setUser(data);
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, requestVerificationEmail }}>
      {children}
    </AuthContext.Provider>
  );
};
