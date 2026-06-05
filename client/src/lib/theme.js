'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  useEffect(() => { const s = localStorage.getItem('theme') || 'dark'; setTheme(s); document.documentElement.setAttribute('data-theme', s); }, []);
  const toggleTheme = () => { const n = theme === 'dark' ? 'light' : 'dark'; setTheme(n); localStorage.setItem('theme', n); document.documentElement.setAttribute('data-theme', n); };
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} className="w-8 h-8 rounded-lg bg-[var(--input)] border border-[var(--border)] flex items-center justify-center text-xs cursor-pointer hover:border-[var(--accent)] transition-colors">
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}
