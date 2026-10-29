import { supabase, authReady } from './supabase';

export type Row = Record<string, any>;
type Opts = { match?: Row; order?: string; limit?: number };

const lk = (t: string) => `anonbook_db_${t}`;
const readLocal = (t: string): Row[] => {
  try { return JSON.parse(localStorage.getItem(lk(t)) || '[]'); } catch { return []; }
};
const writeLocal = (t: string, rows: Row[]) => localStorage.setItem(lk(t), JSON.stringify(rows));
const matches = (r: Row, m: Row) => Object.entries(m).every(([k, v]) => r[k] === v);

/** Tiny data layer: Supabase when configured, localStorage otherwise. */
export const db = {
  async select(t: string, o: Opts = {}): Promise<Row[]> {
    if (supabase) {
      if (t === 'messages') await authReady(); // private table: needs the session token
      let q = supabase.from(t).select('*');
      if (o.match) q = q.match(o.match);
      if (o.order) q = q.order(o.order, { ascending: false });
      if (o.limit) q = q.limit(o.limit);
      const { data, error } = await q;
      if (error) throw error;
      return data as Row[];
    }
    let rows = readLocal(t);
    if (o.match) rows = rows.filter((r) => matches(r, o.match!));
    if (o.order) rows = [...rows].sort((a, b) => String(b[o.order!]).localeCompare(String(a[o.order!])));
    if (o.limit) rows = rows.slice(0, o.limit);
    return rows;
  },

  async insert(t: string, row: Row) {
    const full = { created_at: new Date().toISOString(), ...row };
    if (supabase) {
      await authReady();
      const { error } = await supabase.from(t).insert(full);
      if (error) throw error;
      return;
    }
    writeLocal(t, [...readLocal(t), full]);
  },

  async upsert(t: string, row: Row, key: string) {
    if (supabase) {
      await authReady();
      const { error } = await supabase.from(t).upsert(row, { onConflict: key });
      if (error) throw error;
      return;
    }
    const rows = readLocal(t);
    const i = rows.findIndex((r) => r[key] === row[key]);
    if (i >= 0) rows[i] = { ...rows[i], ...row };
    else rows.push({ created_at: new Date().toISOString(), ...row });
    writeLocal(t, rows);
  },

  async delete(t: string, match: Row) {
    if (supabase) {
      await authReady();
      const { error } = await supabase.from(t).delete().match(match);
      if (error) throw error;
      return;
    }
    writeLocal(t, readLocal(t).filter((r) => !matches(r, match)));
  },
};
