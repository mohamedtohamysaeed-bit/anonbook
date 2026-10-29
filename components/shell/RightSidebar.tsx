'use client';
import { useCallback, useEffect, useState } from 'react';
import { db, Row } from '@/lib/db';
import Avatar from '../Avatar';
import { useAnon } from '../AnonAuth';

export default function RightSidebar() {
  const { address } = useAnon();
  const [users, setUsers] = useState<Row[]>([]);
  const [following, setFollowing] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!address) return;
    const all = await db.select('users', { order: 'created_at', limit: 15 });
    setUsers(all.filter((u) => u.wallet_address !== address));
    setFollowing((await db.select('follows', { match: { follower: address } })).map((f) => f.following));
  }, [address]);

  useEffect(() => { load().catch(console.warn); }, [load]);

  const toggle = async (w: string) => {
    if (!address) return;
    if (following.includes(w)) await db.delete('follows', { follower: address, following: w });
    else await db.insert('follows', { follower: address, following: w });
    load();
  };

  return (
    <aside className="hidden xl:block sticky top-[72px] h-fit card p-3">
      <h3 className="font-semibold text-[var(--text-secondary)] px-2 mb-2">Contacts</h3>
      {users.length === 0 && <p className="text-sm text-[var(--text-secondary)] px-2">No one else is here yet.</p>}
      <ul className="space-y-1">
        {users.map((u) => (
          <li key={u.wallet_address} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg-main)]">
            <Avatar address={u.wallet_address} size={34} />
            <span className="flex-1 truncate text-sm">{u.username}</span>
            <button onClick={() => toggle(u.wallet_address)} className="text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]">
              {following.includes(u.wallet_address) ? 'Following' : 'Follow'}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
