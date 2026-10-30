'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, UsersRound, Store, Clapperboard } from 'lucide-react';
import { SIDEBAR_ITEMS, isActive } from './nav';
import Avatar from '../Avatar';
import { useAnon } from '../AnonAuth';

const ICONS: Record<string, any> = { Users, UsersRound, Store, Clapperboard };

export default function LeftSidebar() {
  const { address, name } = useAnon();
  const path = usePathname();

  return (
    <aside className="hidden lg:block sticky top-[72px] h-fit sidebar-panel p-3">
      <Link href="/" className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg-main)]">
        <Avatar address={address} size={40} online />
        <div className="min-w-0">
          <div className="font-semibold truncate">{name || '...'}</div>
          <div className="text-xs text-[var(--text-secondary)]">Anonymous</div>
        </div>
      </Link>
      <nav className="mt-2 space-y-1">
        {SIDEBAR_ITEMS.map(({ label, icon, href }) => {
          const Icon = ICONS[icon];
          const active = isActive(path, href);
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg-main)] ${active ? 'bg-[var(--bg-main)] font-semibold text-[var(--text-main)]' : 'text-[var(--text-secondary)]'}`}
            >
              <Icon size={22} className={active ? 'text-[var(--primary)]' : ''} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
