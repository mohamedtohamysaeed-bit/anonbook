// Runs `next build`.
//  - If the SWC minifier crashes ("webpack.WebpackError is not a constructor"), retries once with NO_MINIFY=1
//    so the deploy still succeeds without any manual build variable.
//  - If the build still fails, reprints the error lines at the END of the log (CI viewers often collapse the middle).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

// Resolve from this script's folder first, then from the current working directory.
const requires = [createRequire(import.meta.url), createRequire(join(process.cwd(), 'package.json'))];
const require = requires[0];

function findNextBin() {
  for (const req of requires) {
    const attempts = [
      () => req.resolve('next/dist/bin/next'),
      () => join(dirname(req.resolve('next/package.json')), 'dist', 'bin', 'next'),
    ];
    for (const attempt of attempts) {
      try {
        const p = attempt();
        if (existsSync(p)) return p;
      } catch { /* try the next option */ }
    }
  }
  return null;
}

const nextBin = findNextBin();
if (!nextBin) {
  console.error(
    '\n[build.mjs] Could not find Next.js (node_modules/next/dist/bin/next).\n' +
    'Dependencies are not installed or the install is incomplete. In the project folder run:\n' +
    '  npm.cmd install        (Windows PowerShell)   or   npm install   (macOS / Linux)\n' +
    'If that already ran, delete node_modules (Remove-Item -Recurse -Force node_modules), then run it again.\n' +
    'Working directory: ' + process.cwd() + '\n',
  );
  process.exit(1);
}

function run(extraEnv = {}) {
  return new Promise((resolve) => {
    const lines = [];
    const keep = (chunk) => { for (const l of chunk.toString().split('\n')) if (l.trim()) lines.push(l); };
    const child = spawn(process.execPath, [nextBin, 'build'], {
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', FORCE_COLOR: '0', ...extraEnv },
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (d) => { process.stdout.write(d); keep(d); });
    child.stderr.on('data', (d) => { process.stderr.write(d); keep(d); });
    child.on('close', (code) => resolve({ code: code ?? 1, lines }));
  });
}

let result = await run();

if (result.code && !process.env.NO_MINIFY && result.lines.some((l) => /webpack\.WebpackError is not a constructor/.test(l))) {
  console.log('\n[build.mjs] Minifier crash detected. Retrying once with NO_MINIFY=1 ...\n');
  rmSync('.next', { recursive: true, force: true });
  result = await run({ NO_MINIFY: '1' });
}

if (result.code) {
  const pattern = /error|failed|module not found|cannot find|can't resolve|type error|unexpected|undefined|not defined|prerender/i;
  const key = result.lines.filter((l) => pattern.test(l)).slice(0, 30);
  console.error('\n===== NEXT BUILD FAILED (exit ' + result.code + ') =====');
  console.error('--- key error lines ---');
  console.error(key.length ? key.join('\n') : '(none matched)');
  if (result.lines.some((l) => /type error/i.test(l))) {
    // Next prints only the FIRST type error. Run tsc once to list all of them so they can be fixed together.
    try {
      const tsc = (() => { for (const r of requires) { try { return r.resolve('typescript/bin/tsc'); } catch {} } throw new Error('typescript not installed'); })();
      const r = spawnSync(process.execPath, [tsc, '--noEmit', '--pretty', 'false'], { encoding: 'utf8', timeout: 180000 });
      const errs = `${r.stdout || ''}${r.stderr || ''}`.split('\n').filter((l) => /error TS\d+/.test(l));
      console.error('--- all TypeScript errors (' + errs.length + ') ---');
      console.error(errs.slice(0, 40).join('\n') || '(tsc reported none)');
    } catch (e) {
      console.error('(could not run tsc: ' + e.message + ')');
    }
  }
  console.error('--- last 40 lines ---');
  console.error(result.lines.slice(-40).join('\n'));
  console.error('===== END OF BUILD ERROR REPORT =====');
}
process.exit(result.code);
