-- Safe to run on a fresh DB or on one that used the old open policies.
alter table posts add column if not exists media_type text default 'image';

-- Wallet address taken from the signed JWT issued by the `auth` Edge Function.
create or replace function public.wallet() returns text
language sql stable as $$ select lower(auth.jwt() ->> 'wallet') $$;

-- Enable RLS and drop every old policy (including the open MVP ones).
do $$
declare t text; p record;
begin
  foreach t in array array['users','posts','marketplace_products','likes','follows','comments','messages'] loop
    execute format('alter table %I enable row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on %I', p.policyname, t);
    end loop;
  end loop;
end $$;

-- Public reads (not messages)
create policy "read" on users                for select to anon, authenticated using (true);
create policy "read" on posts                for select to anon, authenticated using (true);
create policy "read" on marketplace_products for select to anon, authenticated using (true);
create policy "read" on likes                for select to anon, authenticated using (true);
create policy "read" on follows              for select to anon, authenticated using (true);
create policy "read" on comments             for select to anon, authenticated using (true);

-- Writes only as yourself
create policy "insert own" on users for insert to authenticated with check (wallet_address = public.wallet());
create policy "update own" on users for update to authenticated using (wallet_address = public.wallet()) with check (wallet_address = public.wallet());

create policy "insert own" on posts for insert to authenticated with check (author_wallet = public.wallet());
create policy "delete own" on posts for delete to authenticated using (author_wallet = public.wallet());

create policy "insert own" on marketplace_products for insert to authenticated with check (seller_wallet = public.wallet());
create policy "delete own" on marketplace_products for delete to authenticated using (seller_wallet = public.wallet());

create policy "insert own" on likes for insert to authenticated with check (wallet = public.wallet());
create policy "delete own" on likes for delete to authenticated using (wallet = public.wallet());

create policy "insert own" on follows for insert to authenticated with check (follower = public.wallet());
create policy "delete own" on follows for delete to authenticated using (follower = public.wallet());

create policy "insert own" on comments for insert to authenticated with check (author_wallet = public.wallet());
create policy "delete own" on comments for delete to authenticated using (author_wallet = public.wallet());

-- Messages: only the two people in the conversation can read; you can only send as yourself
create policy "read mine" on messages for select to authenticated using (from_wallet = public.wallet() or to_wallet = public.wallet());
create policy "send as me" on messages for insert to authenticated with check (from_wallet = public.wallet());
