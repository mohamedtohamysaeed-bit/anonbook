# AnonBook

Anonymous, wallet-based social network with a dark, Discord-inspired look (the product is AnonBook). No email, phone or name.
Wallet address = user ID (`anon_xxxxxx`). Data in Supabase, media pinned on IPFS (Pinata). No gas, no fees for users.

## Theme

Dark Discord palette by default (`app/globals.css`): background `#313338`, cards `#2B2D31`, header/sidebars `#1E1F22`, inputs `#383A40`, blurple `#5865F2` (hover `#4752C4`), text `#F2F3F5` / `#B5BAC1`, border `#3F4147`, online `#23A559`, 8px radius, scrollbar `#1A1B1E`.
The header toggle switches to a light variant by adding the class `light` on `<html>` (remembered in localStorage).
Mobile: the header search icon expands into a full-width field, and a bottom navigation bar replaces the sidebar. Friends, Groups and Watch are placeholders for now.

## Windows (PowerShell)

If `npm` is blocked ("running scripts is disabled"), use `npm.cmd`, or allow scripts once:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
Needs **Node 22 x64**. Check with `node -p "process.arch"` (must print `x64`).

```powershell
npm.cmd install
npm.cmd run build        # Next.js compile check
```
`npm.cmd run build` on Windows only checks that Next.js compiles. OpenNext warns it is not fully compatible with native Windows, so let Cloudflare (Linux) run the real `opennextjs-cloudflare build`, or use WSL.

### Updating on Windows (without losing `.git`)
Do not extract the zip over the project folder. Extract into a new folder and copy:
```powershell
Expand-Archive -Path .\anonbook-FINAL-V6.1-ANONBOOK-DISCORD-COLORS.zip -DestinationPath C:\anonbook-new -Force
robocopy C:\anonbook-new C:\anonbook /E /XD .git node_modules .next
```
The zip contains no `.git` folder. If `.git` was already lost, re-attach the history:
```powershell
cd C:\anonbook
git init
git branch -M main
git remote add origin https://github.com/mohamedtohamysaeed-bit/anonbook.git
git fetch origin
git reset origin/main      # keeps your files, adopts the remote history
```

### Clean install (corrupted node_modules, "SWC ... not a valid Win32 application", `@types/node` parse errors)
```powershell
Remove-Item -Recurse -Force node_modules, .next
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\next-swc" -ErrorAction SilentlyContinue
npm.cmd cache clean --force
npm.cmd install
```
`package-lock.json` is intentionally not used (`.npmrc` sets `package-lock=false`, and it is git-ignored): a lockfile patched by Next on Windows broke Cloudflare's `npm clean-install`.
If your GitHub repo already contains a `package-lock.json` (or `bun.lock`), remove it once so Cloudflare does a plain install instead of `npm clean-install`:
```powershell
git rm --cached package-lock.json
Remove-Item package-lock.json -ErrorAction SilentlyContinue
git commit -m "remove lockfile" ; git push origin main
```

## Environment variables
See `.env.example` (every variable, where it goes and why). Public `NEXT_PUBLIC_*` values are copied into the bundle at **build** time:
- locally in `.env.local`
- on Cloudflare in **Workers & Pages -> anonbook -> Settings -> Build -> Variables and secrets** (the *Build* section, type *Text*). The runtime "Variables and secrets" page does not reach the build. Then **Deployments -> Retry build**.

| Variable | Needed for | If missing |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | saving posts, listings, messages | **red banner**, demo mode: posts live only in that browser, images are placeholders |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect / mobile wallets | **yellow banner**; browser wallets and the built-in anonymous wallet still work |
| `NEXT_PUBLIC_STORAGE_BUCKET` | optional Supabase Storage fallback for media | media goes to IPFS only |
| `NODE_VERSION=22` (Cloudflare only) | dependencies that need Node 22+ | warnings, possible install problems |

The app never crashes without these: it falls back to localStorage with a visible warning.
`PINATA_JWT` and `JWT_SECRET` are Supabase secrets, never Cloudflare variables, and the browser never sees them. `SUPABASE_SERVICE_ROLE_KEY` is injected into Edge Functions by Supabase, is not used by AnonBook, and must not be put on Cloudflare.

**Where photos and video go** (`lib/storage.ts`): 1) IPFS through the `pin` Edge Function, 2) the Supabase Storage bucket if `NEXT_PUBLIC_STORAGE_BUCKET` is set, 3) a browser-only placeholder, but only in demo mode. If Supabase is configured and 1 and 2 both fail, the upload is refused with an error and a yellow banner, because a placeholder would show as a broken image for every other visitor.

## Supabase setup
Do these in order:
1. **SQL Editor:** run `supabase/schema.sql`, then `supabase/policies.sql`.
2. **Optional media fallback:** run `supabase/storage.sql` (creates the public bucket `anonbook-media`) and set `NEXT_PUBLIC_STORAGE_BUCKET=anonbook-media` as a Cloudflare build variable.
3. **Pinata:** create an API key allowed only `pinFileToIPFS` and copy its JWT.
4. **Edge Functions** (auth + pin) and their secrets:
```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase secrets set JWT_SECRET=<project JWT secret> PINATA_JWT=<pinata jwt>
npx supabase functions deploy auth --no-verify-jwt
npx supabase functions deploy pin  --no-verify-jwt
```
   `JWT_SECRET` is in Supabase -> Project Settings -> API -> JWT secret.
5. **WalletConnect** (cloud.reown.com): add your `*.workers.dev` / custom domain to the allowed origins.

How security works: the wallet signs a login message, the `auth` function verifies it and returns a 24h JWT carrying the wallet address, row-level security allows writes only for that wallet, uploads go through the `pin` function (the Pinata JWT stays server-side), storage uploads are limited to your own folder, and messages are readable only by sender and recipient.

## Deploy to Cloudflare (OpenNext)
Uses `@opennextjs/cloudflare` on Next 15 / React 19. Dashboard: Workers & Pages -> Create -> import the GitHub repo.
- Worker / project name: `anonbook` (must match `name` in `wrangler.toml`)
- Build command: `npx opennextjs-cloudflare build`
- Deploy command: `npx opennextjs-cloudflare deploy`
- Build variables (Settings -> Build -> Variables and secrets): the public ones from `.env.example` + `NODE_VERSION=22`
- **Clear cache:** if installs restore an old dependency cache (or you see `Invalid Version` / `npm clean-install` errors), go to Settings -> Build -> Build cache, clear or disable it, then Retry build.

**Traffic 0% / site still shows "Hello World":** "Hello World" is Cloudflare's placeholder Worker. A build that is "Ready" but not live was uploaded as a version only. Open the Worker -> Deployments, pick the newest version and deploy it at **100%** (the rollout slider), and make sure the production branch uses the deploy command above (not `wrangler versions upload`).

## Build troubleshooting
`npm run build` runs `scripts/build.mjs`, a wrapper around `next build`:
- checks the required project files exist (for example `app/globals.css`) and finds Next.js from two places; if `node_modules` is missing it says to run `npm.cmd install`
- retries once with `NO_MINIFY=1` if the SWC minifier crashes (`webpack.WebpackError is not a constructor`)
- on failure, reprints the key error lines and, for type errors, every TypeScript error (up to 40), plus environment hints
- switches: `NO_MINIFY=1|js|css`, `SKIP_TYPECHECK=1` (ignores type and lint errors), `NO_LINT=1`

**Stubs (`next.config.js`)** — the build prints `[STUB] ...` lines:
- lazy stubs (`lib/stubs/empty-module.js`): `@base-org/account`, `@coinbase/cdp-sdk`, `@coinbase/cdp` and every subpath; throw only if that connector is actually used
- optional stubs (`lib/stubs/missing-module.js`): `pino-pretty`, `lokijs`, `encoding`, `bufferutil`, `utf-8-validate`; behave like "not installed", and leave no `require()` for OpenNext's esbuild to fail on
- `@react-native-async-storage/async-storage` resolves to an empty module
- auto-stub: an unresolvable import from wagmi / `@wagmi/*` / RainbowKit is stubbed and logged (`STUB_AUTO=0` disables). It currently stubs `@metamask/sdk`, so MetaMask *mobile SDK* login is unavailable; the browser extension and WalletConnect work
- extra packages via build variables (comma / space / semicolon separated): `EXTRA_STUBBED_PACKAGES="a, b"` (lazy) and `EXTRA_MISSING_PACKAGES="c"` (optional)
- `pino` is deliberately not stubbed (WalletConnect needs it); wagmi, viem and RainbowKit must stay bundled

`@types/node` is pinned to `20.11.0` (with an `overrides` entry) and `skipLibCheck` is on. Install warnings (ERESOLVE, deprecated `uuid`, `glob`, `@walletconnect/*`) come from wagmi's own dependencies; they are warnings, not failures.
Compile time depends on Next's native SWC binary. If it cannot load (corrupt install or 32-bit Node) Next falls back to a slow WASM compiler and the compile takes minutes instead of seconds.

## Content moderation
`moderatedUploadMany` (plugins/content-moderation-plugin) is the only path to uploads (IPFS, or the Supabase Storage fallback). `lib/nsfw.ts` loads TensorFlow.js and nsfwjs at runtime from jsDelivr (unpkg fallback); they are not bundled because bundling broke the build. If they cannot load, uploads are refused (fail closed). Blocks Porn / Hentai / Sexy above 0.7 with "الصورة دي غير مسموحة - محتوى غير لائق". Videos (max 120s, 25MB) are checked on 8 sampled frames; images max 10MB.

## Structure
```
app/            globals.css, layout.tsx, providers.tsx, page.tsx, marketplace/
components/     AnonAuth, Avatar, shell/ (Header, LeftSidebar, RightSidebar, BottomNav, Shell, nav, ThemeToggle, DevBanner), feed/
lib/            supabase.ts, env.ts, storage.ts, session.ts, db.ts, ipfs.ts, nsfw.ts, wallet.ts, utils.ts, stubs/
plugins/        plugin-registry.json, content-moderation-plugin/, marketplace-plugin/
scripts/        build.mjs
supabase/       schema.sql, policies.sql, storage.sql, functions/auth, functions/pin
```

## Known limits
- NSFW checks run in the browser and can be bypassed by a modified client; add server-side scanning if abuse appears.
- Smart-contract wallets (EIP-1271) are not supported by the `auth` function.
- Messages are protected from other users but not end-to-end encrypted.
- A burner wallet lives in `localStorage`; clearing browser data loses that account.
- "Never disappears" holds while files stay pinned on Pinata and the Supabase project stays active; free tiers have limits.
