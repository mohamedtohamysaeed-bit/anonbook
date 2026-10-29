'use client';
import { isSupabaseReady } from '@/lib/supabase';
import { useAnon } from '../AnonAuth';

export default function DevBanner() {
  const { address, authed } = useAnon();
  const todo: string[] = [];
  if (!isSupabaseReady) todo.push('Supabase env not set: data stays in this browser and images use mock CIDs');
  else if (address && !authed) todo.push('Signing in… approve the signature request if your wallet asks. Posting is disabled until then');
  if (!todo.length) return null;
  return (
    <div className="bg-[var(--bg-post)] border-b border-[var(--border)] text-xs text-[var(--text-secondary)] text-center py-1.5 px-3">
      {isSupabaseReady ? '' : 'TODO (dev mode): '}{todo.join(' · ')}
    </div>
  );
}
