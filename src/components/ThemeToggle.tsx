import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      id="btn-theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${resolvedTheme === 'dark' ? 'Light Theme' : 'Dark Theme'}`}
      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer flex items-center justify-center shadow-2xs"
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-90 duration-200" />
      ) : (
        <Moon className="w-4 h-4 text-slate-600 animate-in spin-in-90 duration-200" />
      )}
    </button>
  );
};
