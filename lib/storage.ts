import { supabase, isSupabaseReady, authReady, getToken } from './supabase';
import { uploadToIPFS, ipfsUrl, mockUpload } from './ipfs';
import { ENV } from './env';

export type UploadResult = { ref: string; backend: 'ipfs' | 'supabase-storage' | 'mock' };

export class StorageError extends Error {}

// ---- visible warnings (shown by DevBanner, also logged) -------------------------------------------------------
export type StorageWarning = { id: number; message: string };
const listeners = new Set<(w: StorageWarning) => void>();
let seq = 0;

export function onStorageWarning(fn: (w: StorageWarning) => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
function warn(message: string) {
  console.warn('[storage] ' + message);
  const w = { id: ++seq, message };
  listeners.forEach((fn) => fn(w));
}

const reason = (e: unknown) => (e instanceof Error ? e.message : String(e));

// ---- Supabase Storage fallback ---------------------------------------------------------------------------------
function walletFromToken(token: string): string {
  const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '=')));
  return String(json.wallet).toLowerCase();
}

async function uploadToBucket(file: File, bucket: string): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured');
  await authReady();
  const token = getToken();
  if (!token) throw new Error('not signed in');
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
  // The first folder must equal the wallet: supabase/storage.sql only allows uploads into your own folder.
  const path = `${walletFromToken(token)}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type || undefined, upsert: false, cacheControl: '31536000' });
  if (error) throw new Error(error.message);
  return `sb:${bucket}/${path}`;
}

/**
 * Stores a file and returns a reference to save in the database. Order:
 *   1. IPFS via the `pin` Edge Function (Pinata JWT stays server-side)
 *   2. Supabase Storage, if NEXT_PUBLIC_STORAGE_BUCKET is set
 *   3. only in demo mode (no Supabase variables): a browser-only placeholder, with a loud warning
 * With Supabase configured, a failure of 1 and 2 throws instead of saving a placeholder, because a placeholder
 * would show up as a broken image for every other visitor.
 */
export async function uploadMedia(file: File): Promise<UploadResult> {
  if (!isSupabaseReady) {
    warn('Demo mode: Supabase variables are missing, so this file was NOT uploaded anywhere. It is a placeholder visible only in this browser.');
    return { ref: await mockUpload(file), backend: 'mock' };
  }

  const problems: string[] = [];
  try {
    return { ref: await uploadToIPFS(file), backend: 'ipfs' };
  } catch (e) {
    problems.push(`IPFS: ${reason(e)}`);
  }

  if (ENV.storageBucket) {
    try {
      const ref = await uploadToBucket(file, ENV.storageBucket);
      warn(`IPFS is not working (${problems[0]}), so this file was saved in Supabase Storage instead. Deploy the "pin" function and set the PINATA_JWT secret to use IPFS.`);
      return { ref, backend: 'supabase-storage' };
    } catch (e) {
      problems.push(`Supabase Storage "${ENV.storageBucket}": ${reason(e)}`);
    }
  } else {
    problems.push('Supabase Storage: NEXT_PUBLIC_STORAGE_BUCKET is not set');
  }

  warn(`Upload failed. ${problems.join(' | ')}`);
  throw new StorageError(
    `Upload failed: media storage is not set up (${problems.join('; ')}). The site owner must deploy the "pin" function with PINATA_JWT, or set NEXT_PUBLIC_STORAGE_BUCKET.`,
  );
}

/** Turns a stored reference (IPFS CID, `sb:<bucket>/<path>` or demo placeholder) into a viewable URL. */
export function mediaUrl(ref?: string | null): string {
  if (!ref) return '';
  if (ref.startsWith('sb:') && ENV.supabaseUrl) {
    return `${ENV.supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${ref.slice(3)}`;
  }
  return ipfsUrl(ref);
}

export function getStorageStatus() {
  return {
    persistent: isSupabaseReady,
    ipfs: isSupabaseReady ? 'pin Edge Function' : 'not available (demo mode)',
    bucket: ENV.storageBucket || null,
  };
}
