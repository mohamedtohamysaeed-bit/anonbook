import { beginAuth, finishAuth } from './supabase';

type Signer = (message: string) => Promise<`0x${string}`>;
const cacheKey = (a: string) => `anonbook_session_${a}`;

/**
 * Signs a login message with the wallet, trades it for a 24h JWT at the `auth` Edge Function,
 * and installs the token on the Supabase client. Returns the expiry (ms) or null on failure.
 */
export async function login(address: string, sign: Signer): Promise<number | null> {
  beginAuth();
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey(address)) || 'null');
    if (cached && cached.exp - Date.now() > 10 * 60 * 1000) {
      finishAuth(cached.token);
      return cached.exp;
    }
    const message = `AnonBook login\nWallet: ${address}\nIssued: ${Date.now()}`;
    const signature = await sign(message);
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      body: JSON.stringify({ address, message, signature }),
    });
    if (!res.ok) throw new Error(`auth ${res.status}`);
    const { token, exp } = await res.json();
    localStorage.setItem(cacheKey(address), JSON.stringify({ token, exp }));
    finishAuth(token);
    return exp as number;
  } catch (e) {
    console.warn('Login failed', e);
    finishAuth(null);
    return null;
  }
}
