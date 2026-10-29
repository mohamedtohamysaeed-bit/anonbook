const path = require('path');

/** @type {import('next').NextConfig} */

const escapeRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// "a, b;c  d", quotes allowed -> ['a','b','c','d']
const parseList = (v) =>
  (v || '').split(/[\s,;]+/).map((x) => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
const uniq = (list) => Array.from(new Set(list));
const listRegex = (names) => new RegExp('^(?:' + names.map(escapeRe).join('|') + ')(?:/.*)?$'); // package + any subpath

// 1) Unused wallet SDKs wagmi imports statically. Replaced by a stub that only throws if actually used.
//    Extend with the build variable EXTRA_STUBBED_PACKAGES="pkg1, pkg2".
const LAZY_STUBS = uniq(
  ['@base-org/account', '@coinbase/cdp-sdk', '@coinbase/cdp'].concat(parseList(process.env.EXTRA_STUBBED_PACKAGES)),
);
// 2) Optional native/dev packages that libraries load inside try/catch. Replaced by a stub that throws
//    "module not found", exactly like a package that isn't installed. Extend with EXTRA_MISSING_PACKAGES.
//    (`pino` itself is NOT stubbed: WalletConnect's logger needs it.)
const MISSING_STUBS = uniq(
  ['pino-pretty', 'lokijs', 'encoding', 'bufferutil', 'utf-8-validate'].concat(parseList(process.env.EXTRA_MISSING_PACKAGES)),
);
// 3) Packages that should resolve to an empty module (documented fix for the MetaMask SDK).
const EMPTY_ALIASES = ['@react-native-async-storage/async-storage'];

const EMPTY_MODULE = path.resolve(__dirname, 'lib', 'stubs', 'empty-module.js');
const MISSING_MODULE = path.resolve(__dirname, 'lib', 'stubs', 'missing-module.js');

// 4) Safety net: a bare import coming from wagmi / @wagmi/* / RainbowKit that cannot be resolved at all (a new
//    optional connector SDK that isn't installed) is stubbed automatically. Turn off with STUB_AUTO=0.
const AUTO_STUB = process.env.STUB_AUTO !== '0';
const WALLET_CONTEXT = /[\\/]node_modules[\\/](?:\.bun[\\/][^\\/]+[\\/]node_modules[\\/])?(?:wagmi|@wagmi|@rainbow-me)[\\/]/;
// npm package names never start with '.', so './x', '../x' and absolute paths are not matched
const BARE_SPECIFIER = /^(?:@[a-z0-9][a-z0-9_.-]*\/)?[a-z0-9][a-z0-9_.-]*(?:\/|$)/i;
const autoStub = (resource) => {
  const request = resource.request;
  const context = resource.context;
  if (!AUTO_STUB || !request || !context || !BARE_SPECIFIER.test(request) || !WALLET_CONTEXT.test(context)) return;
  try {
    require.resolve(request, { paths: [context] });
  } catch (e) {
    if (e && e.code === 'MODULE_NOT_FOUND') {
      console.log('[STUB] auto-stubbed missing optional dependency: ' + request);
      resource.request = EMPTY_MODULE;
    }
  }
};

if (!global.__anonbookStubLogged) {
  global.__anonbookStubLogged = true;
  console.log('[STUB] stubbing (lazy): ' + LAZY_STUBS.join(', '));
  console.log('[STUB] stubbing (optional/missing): ' + MISSING_STUBS.join(', '));
  console.log('[STUB] empty: ' + EMPTY_ALIASES.join(', ') + ' | auto-stub: ' + (AUTO_STUB ? 'on' : 'off'));
}

const nextConfig = {
  reactStrictMode: true,
  // Diagnostic switch: SKIP_TYPECHECK=1 (build variable) ignores type/lint errors for one build.
  typescript: { ignoreBuildErrors: process.env.SKIP_TYPECHECK === '1' },
  eslint: { ignoreDuringBuilds: process.env.SKIP_TYPECHECK === '1' },
  webpack: (config, { webpack }) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    config.resolve.alias = { ...config.resolve.alias };
    for (const name of EMPTY_ALIASES) config.resolve.alias[name] = false;

    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(listRegex(LAZY_STUBS), EMPTY_MODULE),
      new webpack.NormalModuleReplacementPlugin(listRegex(MISSING_STUBS), MISSING_MODULE),
      new webpack.NormalModuleReplacementPlugin(/.*/, autoStub),
    );

    // Manual override. scripts/build.mjs sets NO_MINIFY=1 automatically for one retry if the minifier
    // crashes ("webpack.WebpackError is not a constructor"), so normally you never set this yourself.
    // NO_MINIFY=1 -> no minification, NO_MINIFY=js -> skip only the JS minifier, NO_MINIFY=css -> only CSS.
    const mode = process.env.NO_MINIFY;
    if (mode) {
      if (mode === '1') {
        config.optimization.minimize = false;
      } else if (Array.isArray(config.optimization.minimizer)) {
        const skip = mode === 'js' ? 0 : mode === 'css' ? 1 : -1; // Next registers [JS, CSS] in that order
        config.optimization.minimizer = config.optimization.minimizer.filter((_, i) => i !== skip);
      }
    }
    return config;
  },
};
module.exports = nextConfig;
