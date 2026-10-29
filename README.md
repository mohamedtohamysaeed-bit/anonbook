# AnonBook

Anonymous, wallet-based Facebook-style social network. No email, phone or name.
Wallet address = user ID (shown as `anon_xxxxxx`). Off-chain data in Supabase, media pinned on IPFS via Pinata.
No gas, no fees for users.

## Run

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev                   # http://localhost:3000
```

**Windows PowerShell:** if `npm` is blocked ("running scripts is disabled"), either use `npm.cmd` instead of `npm`, or allow scripts once:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
```powershell
npm.cmd install
npm.cmd run build        # Next.js compile check, expect "Compiled successfully"
```
Needs Node 22 or newer (`.nvmrc` / `.node-version` say 22).

Without Supabase env values the app still runs in dev mode: data in localStorage, mock CIDs for media (a TODO banner shows).

## Deploy to Cloudflare (OpenNext adapter)

Uses `@opennextjs/cloudflare` (needs Next 15.5.28+, so the project runs Next 15 with React 19). The app is built into `.open-next/` and deployed as a Worker with static assets. Routes run on the Node.js runtime (via `nodejs_compat`), so do **not** add `export const runtime = 'edge'`; OpenNext doesn't support it.

```bash
npm install
cp .env.example .env.local     # NEXT_PUBLIC_* values are baked in at build time
npm run preview                # build + local preview in the Workers runtime
npm run deploy                 # build + deploy (run `npx wrangler login` once first)
```

Scripts: `cf:build` = `opennextjs-cloudflare build`, `cf:deploy` = `opennextjs-cloudflare deploy`.

**Windows:** OpenNext warns that it is not fully compatible with native Windows ("Could not find compiled Open Next config", bundling errors). On Windows use `npm.cmd run build` only to check that Next.js compiles, and let Cloudflare (Linux) run the real `opennextjs-cloudflare build`, or run it inside WSL (Ubuntu) with Node 22.

**Git-connected deploy (optional):** Workers & Pages -> Create -> connect repo. Build command `npx opennextjs-cloudflare build`, deploy command `npx opennextjs-cloudflare deploy`, and add the variables from `.env.cloudflare.example` as build variables.

After deploying, add your `*.workers.dev` or custom domain to the allowed origins in WalletConnect (cloud.reown.com).

## Push to GitHub, then connect Cloudflare

```bash
git init
git add .
git commit -m "AnonBook initial commit"
git branch -M main
git remote add origin https://github.com/<you>/anonbook.git
git push -u origin main
```
Secrets are never committed: `.env.local` is git-ignored, and `JWT_SECRET` / `PINATA_JWT` live only in Supabase.
Run `npm install` once locally and commit the generated `package-lock.json` so Cloudflare builds use the same versions.

Cloudflare: Workers & Pages -> Create -> Import a repository -> pick `anonbook`.
- Project / Worker name: `anonbook` (must match `name` in `wrangler.toml`)
- Build command: `npx opennextjs-cloudflare build`
- Deploy command: `npx opennextjs-cloudflare deploy`
- Build variables: everything in `.env.cloudflare.example`

## Build troubleshooting

`npm run build` runs `scripts/build.mjs`, which wraps `next build`:
- It finds Next.js from the script's folder and from the working directory; if `node_modules` is missing it prints "run npm.cmd install".
- If the SWC minifier crashes (`webpack.WebpackError is not a constructor`), it retries once with `NO_MINIFY=1`. No manual variable needed.
- If the build fails, the key error lines are reprinted at the end of the log, and on a type error it also lists every TypeScript error (Next prints only the first), up to 40 lines.
- Manual switches: `NO_MINIFY=1|js|css`, and `SKIP_TYPECHECK=1` to test whether type errors are the cause.

**Stubs (`next.config.js`).** The build logs `[STUB] ...` lines showing what is stubbed.
- *Lazy stubs* (`lib/stubs/empty-module.js`): `@base-org/account`, `@coinbase/cdp-sdk`, `@coinbase/cdp` and every subpath. wagmi imports these connectors even though AnonBook doesn't use them, and their latest releases reference files webpack can't resolve. They load fine and throw a clear error only if someone picks that connector.
- *Optional stubs* (`lib/stubs/missing-module.js`): `pino-pretty`, `lokijs`, `encoding`, `bufferutil`, `utf-8-validate`. Libraries load them inside try/catch; the stub behaves like "not installed". This also leaves no `require()` for OpenNext's esbuild step to fail on (`Could not resolve "pino-pretty"`).
- `@react-native-async-storage/async-storage` resolves to an empty module.
- *Auto-stub safety net*: an import from wagmi / `@wagmi/*` / RainbowKit that can't be resolved at all (a future optional connector) is stubbed automatically and logged as `[STUB] auto-stubbed ...`. Disable with `STUB_AUTO=0`.
- Add your own with build variables (commas, spaces or semicolons, quotes ignored): `EXTRA_STUBBED_PACKAGES="pkg1, pkg2"` (lazy) and `EXTRA_MISSING_PACKAGES="pkg3"` (optional).
- `pino` itself is deliberately not stubbed (WalletConnect's logger needs it), and wagmi, viem and RainbowKit must stay bundled; do not mark them external. `open-next.config.ts` is intentionally minimal: OpenNext has no `external` option, so removing the `require()` calls is the fix.

Deprecation warnings during install (uuid@8, glob, `@walletconnect/sign-client`, `@walletconnect/universal-provider`) come from wagmi's own dependencies. They are warnings, not errors; forcing newer majors with `overrides` can break WalletConnect, so they are left alone until wagmi updates them.
The `workerd compatibility_date` and `[empty-glob]` warnings from OpenNext are advisory and do not fail the build.
Commit a `package-lock.json` (run `npm.cmd install` once) so Cloudflare installs the same versions every time.

## Cloudflare variables

Build variables (Settings -> Build -> Variables and secrets): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_WC_PROJECT_ID`, optional `NEXT_PUBLIC_IPFS_GATEWAY`, and `NODE_VERSION=22` (Cloudflare defaulted to Node 20, which many dependencies now reject).
They are inlined at build time, so trigger a new build after changing them. Runtime variables are not needed.

## Structure

```
app/            globals.css, layout.tsx, providers.tsx, page.tsx, marketplace/
components/     AnonAuth, Avatar, shell/*, feed/*
lib/            supabase.ts, session.ts, db.ts, ipfs.ts, wallet.ts, utils.ts
plugins/        plugin-registry.json
                content-moderation-plugin/   NSFW check (images + video frames), only path to IPFS
                marketplace-plugin/          MarketplacePage, ProductDetail, SellForm
supabase/
  schema.sql, policies.sql
  functions/auth/   verifies wallet signature -> 24h JWT
  functions/pin/    authenticated Pinata upload (Pinata JWT stays server-side)
```

## How security works

1. On login the wallet (burner or RainbowKit) signs `AnonBook login / Wallet / Issued`.
2. The `auth` Edge Function verifies the signature and returns a 24h JWT with a `wallet` claim.
3. The client sends that JWT with every Supabase request. Row-level security (`policies.sql`) allows writes only where the row's wallet equals the claim.
4. Uploads go to the `pin` Edge Function, which checks the JWT, type and size, then pins to Pinata with a secret the browser never sees.
5. Messages are readable only by sender and recipient.

## Setup

### 1. Database
In the Supabase SQL Editor run `supabase/schema.sql`, then `supabase/policies.sql`.
(Already ran the old SQL? Run only `policies.sql`. It removes the old open policies and adds the `media_type` column.)

### 2. Pinata JWT
1. https://app.pinata.cloud -> **API Keys -> New Key**, allow only `pinFileToIPFS`.
2. Copy the JWT. It goes into a Supabase secret (next step), not `.env.local`.

### 3. Edge Functions
```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase secrets set JWT_SECRET=<project JWT secret> PINATA_JWT=<pinata jwt>
npx supabase functions deploy auth --no-verify-jwt
npx supabase functions deploy pin  --no-verify-jwt
```
`JWT_SECRET` is in Project Settings -> API (JWT secret). Both functions do their own verification, hence `--no-verify-jwt`.

### 4. Env
Fill `.env.local` with the Supabase URL, anon key, and a WalletConnect project id (https://cloud.reown.com).

## Content moderation
`moderatedUploadMany` runs nsfwjs in the browser. Blocks if Porn, Hentai or Sexy scores above 0.7 and shows "الصورة دي غير مسموحة - محتوى غير لائق". Videos (max 120s, 25MB) are checked by sampling 8 frames spread across the clip. Images max 10MB. Blocked files never reach IPFS.

TensorFlow.js and nsfwjs are loaded at runtime by `lib/nsfw.ts` from jsDelivr (with unpkg as a fallback) via script tags and are intentionally **not** bundled: bundling nsfwjs pulled every model into the Next.js build and broke it (minifier crash, "Cannot statically analyze require"). So they are not in `package.json`.
If the scripts can't load, uploads are refused (fail closed) and the browser console shows which URL failed.
To self-host later, copy the two scripts into `public/vendor/` and point `TF_URLS` / `NSFW_URLS` in `plugins/content-moderation-plugin/index.ts` at them.

## Known limits
- NSFW checks run in the browser, so a modified client can skip them. Add server-side scanning if abuse appears. Sampled video frames can miss a very short explicit clip.
- Smart-contract wallets (EIP-1271 signatures) aren't supported by the `auth` function yet.
- Messages are protected from other users but not end-to-end encrypted: the project owner can read them in the database.
- A burner wallet lives in `localStorage`. Clearing browser data loses that account.
- "Never disappears" holds while files stay pinned on your Pinata account and the Supabase project stays active. Free tiers have storage and bandwidth limits.
