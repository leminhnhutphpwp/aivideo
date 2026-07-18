'use client';

const THEME_KEY = 'horizon-theme';

function getStoredTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem(THEME_KEY) as 'dark' | 'light') || 'dark';
}

function applyTheme(theme: 'dark' | 'light') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(theme);
}

export function initTheme() {
  const theme = getStoredTheme();
  applyTheme(theme);
}

export function toggleTheme(): 'dark' | 'light' {
  const current = getStoredTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
  return next;
}

export function getTheme(): 'dark' | 'light' {
  return getStoredTheme();
}
