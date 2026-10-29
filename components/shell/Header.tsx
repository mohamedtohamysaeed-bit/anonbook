'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import ThemeToggle from './ThemeToggle';
import Avatar from '../Avatar';
import { useAnon } from '../AnonAuth';

export default function Header() {
  const router = useRouter();
  const { address, name } = useAnon();
  const [q, setQ] = useState('');

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-post)] border-b border-[var(--border)] shadow-soft">
      <div className="max-w-[1400px] mx-auto h-14 px-3 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-[var(--primary)]">
          <span className="w-9 h-9 rounded-xl bg-[var(--primary)] text-white grid place-items-center">A</span>
          <span className="hidden sm:block">AnonBook</span>
        </Link>

        <form
          onSubmit={(e) => { e.preventDefault(); router.push(q.trim() ? `/?q=${encodeURIComponent(q.trim())}` : '/'); }}
          className="relative flex-1 max-w-md"
        >
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search AnonBook" className="input !pl-9 !py-2" />
        </form>

        <div className="ml-auto flex items-center gap-2">
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }} />
          <ThemeToggle />
          <div className="hidden md:flex items-center gap-2 pl-1" title={address ?? ''}>
            <Avatar address={address} size={34} />
            <span className="text-sm font-medium">{name}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
