'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ENV_EXAMPLE_URL, getEnvProblems } from '@/lib/env';
import { onStorageWarning, type StorageWarning } from '@/lib/storage';
import { isSupabaseReady } from '@/lib/supabase';
import { useAnon } from '../AnonAuth';

const RED = '#F23F42';
const YELLOW = '#F0B232';

export default function DevBanner() {
  const { address, authed } = useAnon();
  const problems = getEnvProblems();
  const [warning, setWarning] = useState<StorageWarning | null>(null);

  useEffect(() => onStorageWarning(setWarning), []);

  return (
    <div role="region" aria-label="Configuration warnings">
      {problems.map((p) => (
        <div
          key={p.missing.join()}
          role="alert"
          className="px-3 py-2.5 text-sm leading-snug"
          style={p.level === 'error' ? { background: RED, color: '#fff' } : { background: YELLOW, color: '#1E1F22' }}
        >
          <strong>{p.title}</strong>{' '}
          <span>
            Missing: {p.missing.map((m) => (
              <code key={m} className="mx-0.5 rounded px-1 py-0.5 font-mono text-[12px]" style={{ background: 'rgba(0,0,0,0.25)' }}>{m}</code>
            ))}
          </span>{' '}
          <span>{p.detail}</span>{' '}
          <a href={ENV_EXAMPLE_URL} target="_blank" rel="noreferrer" className="font-semibold underline">See .env.example</a>
        </div>
      ))}

      {warning && (
        <div role="alert" className="px-3 py-2 text-sm flex items-start gap-2" style={{ background: YELLOW, color: '#1E1F22' }}>
          <span className="flex-1"><strong>Storage warning:</strong> {warning.message}</span>
          <button onClick={() => setWarning(null)} aria-label="Dismiss" className="shrink-0 p-0.5"><X size={16} /></button>
        </div>
      )}

      {isSupabaseReady && address && !authed && (
        <div className="px-3 py-1.5 text-xs text-center bg-[var(--bg-sidebar)] text-[var(--text-secondary)] border-b border-[var(--border)]">
          Signing in… approve the signature request if your wallet asks. Posting is disabled until then.
        </div>
      )}
    </div>
  );
}
