'use client';
import { useEffect, useState } from 'react';
import { X, ImagePlus } from 'lucide-react';
import { db } from '@/lib/db';
import { moderatedUploadMany, ModerationError } from '@/plugins/content-moderation-plugin';
import { useAnon } from '@/components/AnonAuth';
import { CATEGORIES } from './categories';

export default function SellForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { address, authed } = useAnon();
  const [f, setF] = useState({ title: '', price: '', description: '', category: CATEGORIES[0] });
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const urls = files.map((x) => URL.createObjectURL(x));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [files]);

  const submit = async () => {
    if (!address || !authed) { setErr('Still signing in. Try again in a moment.'); return; }
    if (!f.title.trim() || !(Number(f.price) > 0)) { setErr('Add a title and a price above 0.'); return; }
    if (files.length === 0) { setErr('Add at least one photo.'); return; }
    setBusy(true);
    setErr('');
    try {
      const cids = await moderatedUploadMany(files); // checks all images first, then pins to IPFS
      await db.insert('marketplace_products', {
        id: crypto.randomUUID(), seller_wallet: address, title: f.title.trim(), description: f.description.trim(),
        price_usdt: Number(f.price), category: f.category, image_cids: cids,
      });
      onCreated();
    } catch (e: any) {
      if (e instanceof ModerationError) { setErr(e.message); setFiles([]); }
      else { console.error(e); setErr('Could not publish the listing. Try again.'); }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-3" onClick={onClose}>
      <div className="card w-full max-w-lg max-h-[92vh] overflow-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Sell an item</h2>
          <button onClick={onClose} className="btn-ghost !p-1.5" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <input className="input" placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <div className="flex gap-3">
            <input className="input" type="number" min="0" placeholder="Price (USDT)" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
            <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <textarea className="input resize-none" rows={4} placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />

          <div>
            <div className="text-sm text-[var(--text-secondary)] mb-2">Photos ({files.length}/4)</div>
            <div className="grid grid-cols-4 gap-2">
              {previews.map((src, i) => (
                <div key={src} className="relative aspect-square rounded-xl overflow-hidden border border-[var(--border)]">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute top-1 right-1 p-0.5 rounded-full bg-[var(--bg-post)]" aria-label="Remove"><X size={14} /></button>
                </div>
              ))}
              {files.length < 4 && (
                <label className="aspect-square rounded-xl border border-dashed border-[var(--border)] grid place-items-center cursor-pointer text-[var(--primary)] hover:bg-[var(--bg-main)]">
                  <ImagePlus size={22} />
                  <input type="file" accept="image/*" multiple hidden onChange={(e) => { setFiles([...files, ...Array.from(e.target.files || [])].slice(0, 4)); e.target.value = ''; }} />
                </label>
              )}
            </div>
          </div>

          {err && <p dir="auto" className="text-sm text-red-600">{err}</p>}
          <button onClick={submit} disabled={busy} className="btn-primary w-full">{busy ? 'Checking and publishing…' : 'Publish listing'}</button>
        </div>
      </div>
    </div>
  );
}
