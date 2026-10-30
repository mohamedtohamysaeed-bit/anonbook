'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import ThemeToggle from './ThemeToggle';
import Avatar from '../Avatar';
import { useAnon } from '../AnonAuth';

export default function Header() {
  const router = useRouter();
  const { address, name } = useAnon();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false); // mobile search: icon expands into a full-width field
  const mobileInput = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) mobileInput.current?.focus(); }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(q.trim() ? `/?q=${encodeURIComponent(q.trim())}` : '/');
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-sidebar)] border-b border-[var(--border)] shadow-soft">
      <div className="relative max-w-[1400px] mx-auto h-14 px-3 flex items-center gap-2">
        {/* Mobile expanded search covers the whole header row */}
        {open && (
          <form onSubmit={submit} className="search-expand absolute inset-0 z-10 flex items-center gap-2 px-3 bg-[var(--bg-sidebar)] md:hidden">
            <Search size={18} className="shrink-0 text-[var(--text-secondary)]" />
            <input
              ref={mobileInput}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search AnonBook"
              enterKeyHint="search"
              className="input !py-2"
            />
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost !p-2" aria-label="Close search">
              <X size={20} />
            </button>
          </form>
        )}

        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-[var(--text-main)]">
          <span className="w-9 h-9 rounded-xl bg-[var(--primary)] text-white grid place-items-center">A</span>
          <span className="hidden sm:block">AnonBook</span>
        </Link>

        {/* Desktop search */}
        <form onSubmit={submit} className="relative hidden md:block flex-1 max-w-md ml-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search AnonBook" className="input !pl-9 !py-2" />
        </form>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setOpen(true)} className="md:hidden btn-ghost !p-2 bg-[var(--bg-input)]" aria-label="Search">
            <Search size={20} />
          </button>
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }} />
          <ThemeToggle />
          <div className="hidden md:flex items-center gap-2 pl-1" title={address ?? ''}>
            <Avatar address={address} size={34} online />
            <span className="text-sm font-medium">{name}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
