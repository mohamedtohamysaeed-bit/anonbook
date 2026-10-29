'use client';
import { usePathname } from 'next/navigation';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import DevBanner from './DevBanner';

/** 3-column shell. Plugin routes that need room (marketplace) drop the right column. */
export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const wide = path.startsWith('/marketplace');
  return (
    <>
      <DevBanner />
      <div
        className={`max-w-[1400px] mx-auto px-3 py-4 grid gap-4 ${
          wide ? 'lg:grid-cols-[260px_minmax(0,1fr)]' : 'lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_300px]'
        }`}
      >
        <LeftSidebar />
        <main className="min-w-0 bg-[var(--bg-main)]">{children}</main>
        {!wide && <RightSidebar />}
      </div>
    </>
  );
}
