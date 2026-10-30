'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, UsersRound, Store, Clapperboard } from 'lucide-react';
import { BOTTOM_ITEMS, isActive } from './nav';

const ICONS: Record<string, any> = { Home, Users, UsersRound, Store, Clapperboard };

/** Mobile / tablet navigation (the sidebar is hidden below the lg breakpoint). */
export default function BottomNav() {
  const path = usePathname();
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--bg-sidebar)] border-t border-[var(--border)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Main navigation"
    >
      <ul className="grid grid-cols-5">
        {BOTTOM_ITEMS.map(({ label, icon, href }) => {
          const Icon = ICONS[icon];
          const active = isActive(path, href);
          return (
            <li key={label}>
              <Link
                href={href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active ? 'text-[var(--primary)] font-semibold' : 'text-[var(--text-secondary)]'}`}
              >
                <Icon size={22} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
