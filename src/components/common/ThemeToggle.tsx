import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../utils/cn';

export interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className, size = 'md' }) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      data-testid="theme-toggle-button"
      className={cn(
        'relative inline-flex items-center justify-center rounded-lg border transition-colors cursor-pointer select-none',
        size === 'sm' ? 'w-8 h-8' : 'w-9 h-9',
        'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 shadow-xs',
        className
      )}
    >
      {isDark ? (
        <Sun className={cn(size === 'sm' ? 'w-4 h-4' : 'w-4.5 h-4.5', 'text-amber-400')} />
      ) : (
        <Moon className={cn(size === 'sm' ? 'w-4 h-4' : 'w-4.5 h-4.5', 'text-zinc-600')} />
      )}
    </button>
  );
};
