'use client';
import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { db } from '@/lib/db';
import { moderatedUploadMany, ModerationError } from '@/plugins/content-moderation-plugin';
import Avatar from '../Avatar';
import { useAnon } from '../AnonAuth';

export default function CreatePost({ onPosted }: { onPosted: () => void }) {
  const { address, authed } = useAnon();
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const isVideo = !!file?.type.startsWith('video/');

  const clearMedia = () => { setFile(null); setPreview(null); if (input.current) input.current.value = ''; };

  const submit = async () => {
    if (!address || !authed || (!text.trim() && !file)) return;
    setBusy(true);
    setErr('');
    try {
      let cid: string | null = null;
      if (file) [cid] = await moderatedUploadMany([file]);
      await db.insert('posts', {
        id: crypto.randomUUID(), author_wallet: address, content: text.trim(),
        image_cid: cid, media_type: isVideo ? 'video' : 'image',
      });
      setText('');
      clearMedia();
      onPosted();
    } catch (e: any) {
      if (e instanceof ModerationError) { setErr(e.message); clearMedia(); }
      else { console.error(e); setErr('حصلت مشكلة، حاول تاني'); }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-4">
      <div className="flex gap-3">
        <Avatar address={address} size={40} />
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="What's on your mind?" className="input resize-none !rounded-2xl" />
      </div>

      {preview && (
        <div className="relative mt-3">
          {isVideo
            ? <video src={preview} controls className="rounded-xl max-h-72 w-full border border-[var(--border)]" />
            : <img src={preview} alt="" className="rounded-xl max-h-72 w-full object-cover border border-[var(--border)]" />}
          <button onClick={clearMedia} className="absolute top-2 right-2 p-1.5 rounded-full bg-[var(--bg-post)] border border-[var(--border)]" aria-label="Remove">
            <X size={16} />
          </button>
        </div>
      )}
      {err && <p dir="rtl" className="mt-2 text-sm text-red-600">{err}</p>}

      <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between">
        <button onClick={() => input.current?.click()} className="btn-ghost flex items-center gap-2">
          <ImagePlus size={20} className="text-[var(--primary)]" /> Photo / Video
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*,video/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setErr('');
            setFile(f);
            setPreview(URL.createObjectURL(f));
          }}
        />
        <button onClick={submit} disabled={busy || !authed || (!text.trim() && !file)} className="btn-primary">
          {busy ? 'Checking and posting…' : 'Post'}
        </button>
      </div>
    </div>
  );
}
