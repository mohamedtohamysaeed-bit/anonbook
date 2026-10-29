import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseReady = !!(url && key);

// Session token (wallet-signed JWT). Writes wait until login finishes.
let token: string | null = null;
let pending = false;
let release: () => void = () => {};
let ready: Promise<void> = Promise.resolve();

function arm() {
  if (pending) return;
  pending = true;
  ready = new Promise<void>((r) => { release = () => { pending = false; r(); }; });
}
if (isSupabaseReady) arm();

export const beginAuth = () => { token = null; arm(); };
export const finishAuth = (t: string | null) => { token = t; release(); };
export const authReady = () => ready;
export const getToken = () => token;

const authedFetch: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
};

export const supabase = isSupabaseReady ? createClient(url!, key!, { global: { fetch: authedFetch } }) : null;

if (!supabase && typeof window !== 'undefined') {
  console.warn('TODO: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. Falling back to localStorage (dev only, data stays in this browser).');
}
