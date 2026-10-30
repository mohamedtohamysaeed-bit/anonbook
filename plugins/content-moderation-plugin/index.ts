import { uploadMedia } from '@/lib/storage';
import { loadNsfwModel } from '@/lib/nsfw';

export const BLOCK_MESSAGE = 'الصورة دي غير مسموحة - محتوى غير لائق';
const CHECK_FAILED = 'تعذر فحص الملف، حاول تاني';
const TOO_BIG = 'الملف كبير جدًا (الحد الأقصى 10MB للصور و25MB للفيديو)';
const TOO_LONG = 'الفيديو أطول من 120 ثانية';

const BLOCKED = ['Porn', 'Hentai', 'Sexy'];
const THRESHOLD = 0.7;
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 25 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 120;
const VIDEO_SAMPLES = 8;

export class ModerationError extends Error {}

const isBad = (preds: any[]) => preds.some((p) => BLOCKED.includes(p.className) && p.probability > THRESHOLD);

async function imageAllowed(model: any, file: File) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return !isBad(await model.classify(img));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Samples frames spread across the video and checks each one. */
async function videoAllowed(model: any, file: File) {
  const url = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.muted = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.src = url;
  try {
    await new Promise<void>((res, rej) => { v.onloadeddata = () => res(); v.onerror = () => rej(new Error('video load')); });
    if (!isFinite(v.duration) || v.duration > MAX_VIDEO_SECONDS) throw new ModerationError(TOO_LONG);

    const scale = Math.min(1, 320 / Math.max(v.videoWidth, v.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(v.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(v.videoHeight * scale));
    const ctx = canvas.getContext('2d')!;

    for (let i = 0; i < VIDEO_SAMPLES; i++) {
      const t = ((i + 0.5) / VIDEO_SAMPLES) * v.duration;
      await new Promise<void>((res) => { v.onseeked = () => res(); v.currentTime = t; });
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      if (isBad(await model.classify(canvas))) return false;
    }
    return true;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * The only way media gets uploaded in AnonBook (IPFS, with Supabase Storage as a fallback; see lib/storage.ts).
 * Checks every file first; if any is blocked nothing is uploaded.
 * If the check cannot run (model or CDN unreachable), the upload is refused (fail closed).
 */
export async function moderatedUploadMany(files: File[]): Promise<string[]> {
  for (const f of files) {
    const video = f.type.startsWith('video/');
    if (!video && !f.type.startsWith('image/')) throw new ModerationError(CHECK_FAILED);
    if (f.size > (video ? MAX_VIDEO : MAX_IMAGE)) throw new ModerationError(TOO_BIG);

    let ok: boolean;
    try {
      const model = await loadNsfwModel();
      ok = video ? await videoAllowed(model, f) : await imageAllowed(model, f);
    } catch (e) {
      if (e instanceof ModerationError) throw e;
      console.error('NSFW check failed', e);
      throw new ModerationError(CHECK_FAILED);
    }
    if (!ok) throw new ModerationError(BLOCK_MESSAGE);
  }
  return Promise.all(files.map(async (f) => (await uploadMedia(f)).ref));
}
