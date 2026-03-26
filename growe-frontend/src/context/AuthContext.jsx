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
    let cancelled = false;
    const bootstrap = async () => {
      setLoading(true);
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          localStorage.removeItem('user');
        }
      }
      try {
        // Primary: attempt to restore session via refresh cookie (no access token required)
        const { data: refreshed } = await api.post('/auth/refresh-token');
        if (cancelled) return;
        localStorage.setItem('token', refreshed.token);
        if (refreshed.user) {
          localStorage.setItem('user', JSON.stringify(refreshed.user));
          setUser(refreshed.user);
        }
      } catch (_) {
        // Secondary: if access token exists, validate by fetching /me
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const { data } = await api.get('/auth/me');
            if (cancelled) return;
            setUser(data);
            localStorage.setItem('user', JSON.stringify(data));
          } catch {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (!cancelled) setUser(null);
          }
        } else {
          localStorage.removeItem('user');
          if (!cancelled) setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    bootstrap();
    return () => {
      cancelled = true;
    };
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
    api.post('/auth/logout').catch(() => {});
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

  const isAuthenticated = !!user;
  const isVerified = !!user?.isVerified;

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, isVerified, login, register, logout, refreshUser, requestVerificationEmail }}>
      {children}
    </AuthContext.Provider>
  );
};
