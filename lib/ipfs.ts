import { supabase, authReady, getToken } from './supabase';

const GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
const MOCK_KEY = 'anonbook_mock_ipfs';

const toDataUrl = (file: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

/**
 * Pins a file on IPFS through the `pin` Edge Function (the Pinata JWT stays on the server).
 * Needs a signed-in wallet session. Without Supabase it returns a fake CID (dev only).
 */
export async function uploadToIPFS(file: File): Promise<string> {
  if (!supabase) {
    console.warn('TODO: Supabase is not configured. Using a MOCK CID - this file is NOT on IPFS.');
    const cid = 'bafymock' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    try {
      const map = JSON.parse(localStorage.getItem(MOCK_KEY) || '{}');
      map[cid] = await toDataUrl(file);
      localStorage.setItem(MOCK_KEY, JSON.stringify(map));
    } catch (e) {
      console.warn('Mock file could not be cached locally (too large for localStorage?)', e);
    }
    return cid;
  }

  await authReady();
  const token = getToken();
  if (!token) throw new Error('Not signed in');

  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/pin`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
    body: form,
  });
  if (!res.ok) throw new Error(`Pin failed (${res.status})`);
  return (await res.json()).cid as string;
}

/** Turns a stored CID into a viewable URL. */
export function ipfsUrl(cid?: string | null): string {
  if (!cid) return '';
  if (cid.startsWith('bafymock')) {
    try { return JSON.parse(localStorage.getItem(MOCK_KEY) || '{}')[cid] || ''; } catch { return ''; }
  }
  return GATEWAY.replace(/\/?$/, '/') + cid;
}
