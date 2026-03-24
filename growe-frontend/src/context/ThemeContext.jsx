import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'growe-theme';

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

export const ThemeProvider = ({ children }) => {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [dark]);

  const toggleTheme = () => setDark((d) => !d);

  return (
    <ThemeContext.Provider value={{ dark, setDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
