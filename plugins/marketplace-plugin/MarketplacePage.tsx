'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { db, Row } from '@/lib/db';
import { ipfsUrl } from '@/lib/ipfs';
import { CATEGORIES } from './categories';
import SellForm from './SellForm';

export default function MarketplacePage() {
  const [products, setProducts] = useState<Row[]>([]);
  const [category, setCategory] = useState('All');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [sell, setSell] = useState(false);

  const load = useCallback(() => db.select('marketplace_products', { order: 'created_at', limit: 100 }).then(setProducts).catch(console.error), []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(
    () => products.filter((p) =>
      (category === 'All' || p.category === category) &&
      (!min || Number(p.price_usdt) >= Number(min)) &&
      (!max || Number(p.price_usdt) <= Number(max))),
    [products, category, min, max],
  );

  return (
    <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="card p-4 h-fit md:sticky md:top-[72px]">
        <h2 className="font-bold text-lg mb-3">Marketplace</h2>
        <button onClick={() => setSell(true)} className="btn-primary w-full flex items-center justify-center gap-2">
          <Plus size={18} /> Sell
        </button>

        <h3 className="mt-5 mb-2 text-sm font-semibold text-[var(--text-secondary)]">Category</h3>
        <div className="space-y-1">
          {['All', ...CATEGORIES].map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`block w-full text-left px-3 py-1.5 rounded-xl text-sm ${category === c ? 'bg-[var(--bg-main)] font-semibold text-[var(--primary)]' : 'text-[var(--text-main)] hover:bg-[var(--bg-main)]'}`}>
              {c}
            </button>
          ))}
        </div>

        <h3 className="mt-5 mb-2 text-sm font-semibold text-[var(--text-secondary)]">Price (USDT)</h3>
        <div className="flex gap-2">
          <input value={min} onChange={(e) => setMin(e.target.value)} type="number" min="0" placeholder="Min" className="input !px-2" />
          <input value={max} onChange={(e) => setMax(e.target.value)} type="number" min="0" placeholder="Max" className="input !px-2" />
        </div>
      </aside>

      <section>
        {shown.length === 0 ? (
          <div className="card p-10 text-center text-[var(--text-secondary)]">No products here yet. Be the first to sell something.</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {shown.map((p) => {
              const img = ipfsUrl(p.image_cids?.[0]);
              return (
                <Link key={p.id} href={`/marketplace/${p.id}`} className="card overflow-hidden block hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-[var(--bg-main)]">
                    {img && <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />}
                  </div>
                  <div className="p-3">
                    <div className="font-bold text-[var(--primary)]">{Number(p.price_usdt).toLocaleString()} USDT</div>
                    <div className="text-[var(--text-main)] truncate">{p.title}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{p.category}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {sell && <SellForm onClose={() => setSell(false)} onCreated={() => { setSell(false); load(); }} />}
    </div>
  );
}
