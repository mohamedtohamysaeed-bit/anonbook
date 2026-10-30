'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

/** Dark (Discord) is the default. The toggle switches the "light" class on <html> and remembers the choice. */
export default function ThemeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => setLight(document.documentElement.classList.contains('light')), []);

  const toggle = () => {
    const next = !light;
    document.documentElement.classList.toggle('light', next);
    localStorage.setItem('theme', next ? 'light' : 'dark');
    setLight(next);
  };

  return (
    <button onClick={toggle} aria-label="Toggle light / dark mode" className="btn-ghost !p-2 bg-[var(--bg-input)]">
      {light ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
