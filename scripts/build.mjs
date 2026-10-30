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

// Files the app cannot build without. A missing one usually means the zip was extracted over a folder that got cleaned.
const REQUIRED = ['package.json', 'next.config.js', 'app/layout.tsx', 'app/page.tsx', 'app/globals.css', 'lib/stubs/empty-module.js', 'lib/stubs/missing-module.js',
  'lib/env.ts',
  'lib/storage.ts'
];
const missingFiles = REQUIRED.filter((f) => !existsSync(join(process.cwd(), ...f.split('/'))));
if (missingFiles.length) {
  console.error(
    '\n[build.mjs] Project files are missing in ' + process.cwd() + ':\n  ' + missingFiles.join('\n  ') + '\n' +
    'The project was probably extracted into the wrong folder or partly deleted. Re-extract the zip into a NEW folder and copy it over (see README, "Updating on Windows").\n',
  );
  process.exit(1);
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

console.log(`[build.mjs] Node ${process.version} on ${process.platform} ${process.arch}`);

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
  const text = result.lines.join('\n');
  const hints = [];
  if (/not a valid Win32 application/i.test(text)) {
    hints.push(
      'A native Next.js (SWC) binary is damaged or does not match this machine (see the Node architecture printed at the top: it must be x64). ' +
      'Next falls back to the slow WASM compiler. Reinstall: delete node_modules, run `npm cache verify`, then `npm install`.',
    );
  }
  if (/type error/i.test(text) && /node_modules[\\/]@types[\\/]/.test(text)) {
    hints.push(
      'The type error is inside node_modules/@types, not in AnonBook code. That means a damaged or partial install (an interrupted ' +
      'download, antivirus, or a full disk). Delete node_modules and reinstall; Cloudflare builds on a clean machine are not affected.',
    );
  }
  if (process.platform === 'win32' && process.arch !== 'x64') {
    hints.push('This Node reports architecture "' + process.arch + '" (32-bit). Next.js needs 64-bit Node on Windows: check `node -p "process.arch"`, it must print x64.');
  }
  if (/node_modules[\\/].*\.d\.ts/i.test(text) && /expected|unexpected end|unterminated/i.test(text)) {
    hints.push('A file inside node_modules fails to PARSE (a truncated file). Fix in PowerShell:\n' +
      '    Remove-Item -Recurse -Force node_modules, .next\n    npm.cmd cache clean --force\n    npm.cmd install');
  }
  if (hints.length) {
    console.error('--- hints ---');
    for (const h of hints) console.error('* ' + h);
  }
  console.error('--- last 40 lines ---');
  console.error(result.lines.slice(-40).join('\n'));
  console.error('===== END OF BUILD ERROR REPORT =====');
}
process.exit(result.code);
