// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';
import { ThemeToggle } from '../components/common/ThemeToggle';

const ThemeConsumer = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-val">{theme}</span>
      <span data-testid="resolved-val">{resolvedTheme}</span>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <ThemeToggle />
    </div>
  );
};

describe('ThemeContext & ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('defaults to system/light and switches theme', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    const themeVal = screen.getByTestId('theme-val');
    expect(themeVal.textContent).toBe('system');

    // Click Set Dark
    fireEvent.click(screen.getByText('Set Dark'));
    expect(screen.getByTestId('theme-val').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Toggle back with ThemeToggle button
    const toggleBtn = screen.getByTestId('theme-toggle-button');
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('theme-val').textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
