// Stand-in for OPTIONAL native/dev packages (pino-pretty, bufferutil, utf-8-validate, encoding, lokijs).
// Libraries load these inside try/catch and fall back when they are absent. Throwing the same error Node throws
// for a package that is not installed keeps that fallback working, and leaves no `require()` behind for
// OpenNext's esbuild step to fail on ("Could not resolve ...").
const err = new Error("Cannot find module (optional dependency, intentionally not bundled)");
err.code = 'MODULE_NOT_FOUND';
throw err;
