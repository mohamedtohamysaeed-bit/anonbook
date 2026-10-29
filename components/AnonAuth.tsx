'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import type { Hex } from 'viem';
import { getBurner } from '@/lib/wallet';
import { anonName } from '@/lib/utils';
import { db } from '@/lib/db';
import { isSupabaseReady } from '@/lib/supabase';
import { login } from '@/lib/session';

type Ctx = { address: string | null; name: string; isBurner: boolean; authed: boolean };
const AnonCtx = createContext<Ctx>({ address: null, name: '', isBurner: true, authed: false });
export const useAnon = () => useContext(AnonCtx);

/**
 * Wallet address = user ID. Uses the connected wallet, otherwise an auto-created burner wallet.
 * With Supabase configured, the wallet signs a login message and gets a JWT, so writes are bound to it.
 */
export function AnonProvider({ children }: { children: React.ReactNode }) {
  const { address: connected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [burner, setBurner] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);

  const connectedRef = useRef(connected);
  connectedRef.current = connected;
  const signRef = useRef(signMessageAsync);
  signRef.current = signMessageAsync;

  useEffect(() => { setBurner(getBurner().address); }, []);

  const address = (connected ?? burner)?.toLowerCase() ?? null;

  useEffect(() => {
    if (!address) return;
    setAuthed(false);
    const saveProfile = () => db.upsert('users', { wallet_address: address, username: anonName(address) }, 'wallet_address').catch(console.warn);

    if (!isSupabaseReady) { saveProfile(); setAuthed(true); return; }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const run = async () => {
      const useConnected = connectedRef.current?.toLowerCase() === address;
      // wagmi's newer typings demand an `account` field that its runtime treats as optional, so the connected-wallet
      // call is typed by hand. A burner (local account) signs with just the message.
      const connectedSign = signRef.current as unknown as (v: { message: string }) => Promise<Hex>;
      const burner = getBurner();
      const sign: (m: string) => Promise<Hex> = useConnected
        ? (m) => connectedSign({ message: m })
        : (m) => burner.signMessage({ message: m });
      const exp = await login(address, sign);
      if (cancelled) return;
      if (exp) {
        setAuthed(true);
        saveProfile();
        timer = setTimeout(run, Math.max(exp - Date.now() - 5 * 60 * 1000, 30_000)); // refresh before expiry
      }
    };
    run();

    return () => { cancelled = true; clearTimeout(timer); };
  }, [address]);

  return (
    <AnonCtx.Provider value={{ address, name: address ? anonName(address) : '', isBurner: !connected, authed }}>
      {children}
    </AnonCtx.Provider>
  );
}
