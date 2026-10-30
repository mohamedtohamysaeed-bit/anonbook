// NEXT_PUBLIC_* values must be written literally (process.env.NEXT_PUBLIC_X) so the bundler can inline them.
export const ENV = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  wcProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || process.env.NEXT_PUBLIC_WC_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
};

export const ENV_EXAMPLE_URL = 'https://github.com/mohamedtohamysaeed-bit/anonbook/blob/main/.env.example';

export type EnvProblem = { level: 'error' | 'warn'; title: string; missing: string[]; detail: string };

/** Everything that is missing from the build configuration, with where to fix it. Shown as a banner. */
export function getEnvProblems(): EnvProblem[] {
  const problems: EnvProblem[] = [];

  const missingSupabase: string[] = [];
  if (!ENV.supabaseUrl) missingSupabase.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!ENV.supabaseKey) missingSupabase.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (missingSupabase.length) {
    problems.push({
      level: 'error',
      title: 'DEMO MODE: posts are saved only in this browser (and vanish if you clear it) and images are placeholders.',
      missing: missingSupabase,
      detail:
        'Fix: Cloudflare -> Workers & Pages -> anonbook -> Settings -> Build -> Variables and secrets (the BUILD section, not Runtime). ' +
        'Add them as Text variables, then trigger a new build. Locally, put them in .env.local.',
    });
  }

  if (!ENV.wcProjectId) {
    problems.push({
      level: 'warn',
      title: 'Wallet options are limited to browser wallets (MetaMask extension, etc.) and the built-in anonymous wallet.',
      missing: ['NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID'],
      detail:
        'Fix: create a free Project ID at cloud.reown.com (formerly cloud.walletconnect.com) and add it the same way as a BUILD variable, then rebuild.',
    });
  }

  return problems;
}
