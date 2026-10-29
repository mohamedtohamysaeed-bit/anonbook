'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains('dark')), []);

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    setDark(next);
  };

  return (
    <button onClick={toggle} aria-label="Toggle dark mode" className="btn-ghost !p-2 bg-[var(--bg-main)] border border-[var(--border)]">
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
