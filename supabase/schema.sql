create table if not exists users (
  wallet_address text primary key,
  username text,
  avatar_cid text,
  created_at timestamptz default now()
);
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_wallet text references users(wallet_address) on delete cascade,
  content text,
  image_cid text,
  media_type text default 'image',
  created_at timestamptz default now()
);
create table if not exists marketplace_products (
  id uuid primary key default gen_random_uuid(),
  seller_wallet text references users(wallet_address) on delete cascade,
  title text not null,
  description text,
  price_usdt numeric(12,2) not null,
  category text,
  image_cids text[] default '{}',
  created_at timestamptz default now()
);
create table if not exists likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  wallet text references users(wallet_address) on delete cascade,
  created_at timestamptz default now(),
  unique (post_id, wallet)
);
create table if not exists follows (
  follower text references users(wallet_address) on delete cascade,
  following text references users(wallet_address) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower, following)
);
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  author_wallet text references users(wallet_address) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references marketplace_products(id) on delete cascade,
  from_wallet text references users(wallet_address) on delete cascade,
  to_wallet text references users(wallet_address) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);
