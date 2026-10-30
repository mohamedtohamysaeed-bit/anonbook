'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send } from 'lucide-react';
import { db, Row } from '@/lib/db';
import { mediaUrl } from '@/lib/storage';
import { anonName } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import { useAnon } from '@/components/AnonAuth';

function Chat({ product }: { product: Row }) {
  const { address } = useAnon();
  const [msgs, setMsgs] = useState<Row[]>([]);
  const [text, setText] = useState('');
  const isSeller = address === product.seller_wallet;

  const load = useCallback(async () => {
    const all = await db.select('messages', { match: { product_id: product.id } });
    const mine = all.filter((m) => isSeller || m.from_wallet === address || m.to_wallet === address);
    setMsgs(mine.sort((a, b) => a.created_at.localeCompare(b.created_at)));
  }, [product.id, address, isSeller]);

  useEffect(() => {
    load().catch(console.warn);
    const t = setInterval(() => load().catch(console.warn), 4000);
    return () => clearInterval(t);
  }, [load]);

  // Buyers write to the seller. The seller replies to the most recent buyer.
  const lastBuyer = [...msgs].reverse().find((m) => m.from_wallet !== address)?.from_wallet;
  const to = isSeller ? lastBuyer : product.seller_wallet;

  const send = async () => {
    if (!address || !to || !text.trim()) return;
    await db.insert('messages', { id: crypto.randomUUID(), product_id: product.id, from_wallet: address, to_wallet: to, content: text.trim() });
    setText('');
    load();
  };

  return (
    <div className="card p-4">
      <h3 className="font-semibold mb-3">{isSeller ? 'Messages from buyers' : 'Message seller'}</h3>
      <div className="space-y-2 max-h-72 overflow-auto mb-3">
        {msgs.length === 0 && <p className="text-sm text-[var(--text-secondary)]">{isSeller ? 'No messages yet.' : 'Ask about the item, condition or delivery.'}</p>}
        {msgs.map((m) => {
          const mine = m.from_wallet === address;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`px-3 py-2 rounded-2xl text-sm max-w-[80%] ${mine ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-main)] text-[var(--text-main)]'}`}>
                {isSeller && !mine && <div className="text-xs opacity-70">{anonName(m.from_wallet)}</div>}
                {m.content}
              </div>
            </div>
          );
        })}
      </div>
      {(!isSeller || lastBuyer) && (
        <div className="flex gap-2">
          <input className="input" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Write a message…" />
          <button onClick={send} className="btn-primary" aria-label="Send"><Send size={18} /></button>
        </div>
      )}
    </div>
  );
}

export default function ProductDetail({ id }: { id: string }) {
  const [product, setProduct] = useState<Row | null>(null);
  const [missing, setMissing] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    db.select('marketplace_products', { match: { id: id } })
      .then((r) => (r[0] ? setProduct(r[0]) : setMissing(true)))
      .catch(() => setMissing(true));
  }, [id]);

  if (missing) return <div className="card p-8 text-center">Product not found. <Link href="/marketplace" className="text-[var(--primary)] font-semibold">Back to marketplace</Link></div>;
  if (!product) return <p className="text-center text-[var(--text-secondary)]">Loading…</p>;

  const cids: string[] = product.image_cids || [];

  return (
    <div className="space-y-4">
      <Link href="/marketplace" className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-main)]"><ArrowLeft size={18} /> Marketplace</Link>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-3">
          <div className="aspect-square rounded-xl overflow-hidden bg-[var(--bg-main)]">
            {cids[active] && <img src={mediaUrl(cids[active])} alt="" className="w-full h-full object-cover" />}
          </div>
          {cids.length > 1 && (
            <div className="grid grid-cols-4 gap-2 mt-2">
              {cids.map((c, i) => (
                <button key={c} onClick={() => setActive(i)} className={`aspect-square rounded-xl overflow-hidden border-2 ${i === active ? 'border-[var(--primary)]' : 'border-[var(--border)]'}`}>
                  <img src={mediaUrl(c)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="text-2xl font-bold text-[var(--primary)]">{Number(product.price_usdt).toLocaleString()} USDT</div>
            <h1 className="text-xl font-semibold text-[var(--text-main)] mt-1">{product.title}</h1>
            <div className="text-sm text-[var(--text-secondary)] mt-1">{product.category}</div>
            {product.description && <p className="mt-4 whitespace-pre-wrap text-[var(--text-main)]">{product.description}</p>}
            <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center gap-3">
              <Avatar address={product.seller_wallet} size={36} />
              <div className="text-sm"><div className="font-semibold">{anonName(product.seller_wallet)}</div><div className="text-[var(--text-secondary)]">Seller</div></div>
            </div>
          </div>
          <Chat product={product} />
        </div>
      </div>
    </div>
  );
}
