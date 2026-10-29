'use client';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { db, Row } from '@/lib/db';
import { gradientFor } from '@/lib/utils';

export default function StoriesBar() {
  const [users, setUsers] = useState<Row[]>([]);
  useEffect(() => { db.select('users', { order: 'created_at', limit: 8 }).then(setUsers).catch(console.warn); }, []);

  return (
    <div className="card p-3 flex gap-3 overflow-x-auto">
      <div className="w-24 shrink-0 h-40 rounded-xl border border-[var(--border)] bg-[var(--bg-main)] flex flex-col items-center justify-center gap-2 text-sm">
        <span className="w-9 h-9 rounded-full bg-[var(--primary)] text-white grid place-items-center"><Plus size={20} /></span>
        Add story
      </div>
      {users.map((u) => (
        <div key={u.wallet_address} className="w-24 shrink-0 h-40 rounded-xl relative overflow-hidden" style={{ background: gradientFor(u.wallet_address) }}>
          <span className="absolute bottom-2 left-2 right-2 text-xs font-medium text-white truncate">{u.username}</span>
        </div>
      ))}
    </div>
  );
}
