/**
 * Loads TensorFlow.js and nsfwjs in the browser at runtime from a CDN. They are NOT in package.json and NOT
 * bundled: bundling nsfwjs pulled every model into the Next.js build and broke it (minifier crash and
 * "Cannot statically analyze require"). Each list is tried in order (jsDelivr first, unpkg as fallback).
 */
const TF_URLS = [
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js',
  'https://unpkg.com/@tensorflow/tfjs@4.22.0/dist/tf.min.js',
];
const NSFW_URLS = [
  'https://cdn.jsdelivr.net/npm/nsfwjs@4.2.1/dist/nsfwjs.min.js',
  'https://cdn.jsdelivr.net/npm/nsfwjs@4.2.1/dist/browser/nsfwjs.min.js',
  'https://unpkg.com/nsfwjs@4.2.1/dist/nsfwjs.min.js',
  'https://unpkg.com/nsfwjs@4.2.1/dist/browser/nsfwjs.min.js',
  'https://cdn.jsdelivr.net/npm/nsfwjs@4', // package default entry
];

const w = () => window as any;
const nsfwLib = () => (w().nsfwjs?.load ? w().nsfwjs : w().nsfwjs?.default?.load ? w().nsfwjs.default : null);

function loadScript(url: string) {
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.onload = () => resolve();
    s.onerror = () => { s.remove(); reject(new Error(`could not load ${url}`)); };
    document.head.appendChild(s);
  });
}

async function loadFirst(urls: string[], ready: () => boolean) {
  if (ready()) return;
  let last: unknown;
  for (const url of urls) {
    try {
      await loadScript(url);
      if (ready()) return;
      last = new Error(`${url} loaded but did not expose the expected global`);
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

let modelPromise: Promise<any> | null = null;

/** Resolves to the nsfwjs model, or rejects if the scripts cannot be loaded (callers must then block the upload). */
export function loadNsfwModel(): Promise<any> {
  modelPromise ??= (async () => {
    await loadFirst(TF_URLS, () => !!w().tf);
    await loadFirst(NSFW_URLS, () => !!nsfwLib());
    return nsfwLib().load();
  })().catch((e) => {
    modelPromise = null; // allow a retry on the next upload
    console.error('NSFW model could not be loaded', e);
    throw e;
  });
  return modelPromise;
}
