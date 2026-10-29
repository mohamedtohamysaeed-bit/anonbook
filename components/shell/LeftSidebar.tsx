'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, UsersRound, Store, Clapperboard } from 'lucide-react';
import registry from '@/plugins/plugin-registry.json';
import Avatar from '../Avatar';
import { useAnon } from '../AnonAuth';

const ICONS: Record<string, any> = { Users, UsersRound, Store, Clapperboard };

// Plugins that declare a route add themselves to the sidebar.
const pluginNav = registry.plugins
  .filter((p) => p.enabled && p.route)
  .map((p) => ({ label: p.label as string, icon: p.icon as string, href: p.route as string }));

const items = [
  { label: 'Friends', icon: 'Users', href: '#' },
  { label: 'Groups', icon: 'UsersRound', href: '#' },
  ...pluginNav,
  { label: 'Watch', icon: 'Clapperboard', href: '#' },
];

export default function LeftSidebar() {
  const { address, name } = useAnon();
  const path = usePathname();

  return (
    <aside className="hidden lg:block sticky top-[72px] h-fit card p-3">
      <Link href="/" className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg-main)]">
        <Avatar address={address} size={40} />
        <div className="min-w-0">
          <div className="font-semibold truncate">{name || '...'}</div>
          <div className="text-xs text-[var(--text-secondary)]">Anonymous</div>
        </div>
      </Link>
      <nav className="mt-2 space-y-1">
        {items.map(({ label, icon, href }) => {
          const Icon = ICONS[icon];
          const active = href !== '#' && path.startsWith(href);
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 p-2 rounded-xl text-[var(--text-main)] hover:bg-[var(--bg-main)] ${active ? 'bg-[var(--bg-main)] font-semibold' : ''}`}
            >
              <Icon size={22} className="text-[var(--primary)]" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
