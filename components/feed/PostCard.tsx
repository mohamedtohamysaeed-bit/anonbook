'use client';
import { useState } from 'react';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { db, Row } from '@/lib/db';
import { ipfsUrl } from '@/lib/ipfs';
import { anonName, timeAgo } from '@/lib/utils';
import Avatar from '../Avatar';
import { useAnon } from '../AnonAuth';

export default function PostCard({ post, likes, comments, onChange }: { post: Row; likes: Row[]; comments: Row[]; onChange: () => void }) {
  const { address } = useAnon();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const liked = likes.some((l) => l.wallet === address);

  const toggleLike = async () => {
    if (!address) return;
    if (liked) await db.delete('likes', { post_id: post.id, wallet: address });
    else await db.insert('likes', { id: crypto.randomUUID(), post_id: post.id, wallet: address });
    onChange();
  };

  const addComment = async () => {
    if (!address || !text.trim()) return;
    await db.insert('comments', { id: crypto.randomUUID(), post_id: post.id, author_wallet: address, content: text.trim() });
    setText('');
    onChange();
  };

  const share = async () => {
    const url = `${location.origin}/#${post.id}`;
    if (navigator.share) { try { await navigator.share({ title: 'AnonBook', text: post.content, url }); return; } catch { return; } }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const img = ipfsUrl(post.image_cid);

  return (
    <article id={post.id} className="card">
      <div className="p-4 flex items-center gap-3">
        <Avatar address={post.author_wallet} size={40} />
        <div>
          <div className="font-semibold text-[var(--text-main)]">{anonName(post.author_wallet)}</div>
          <div className="text-xs text-[var(--text-secondary)]">{timeAgo(post.created_at)}</div>
        </div>
      </div>

      {post.content && <p className="px-4 pb-3 whitespace-pre-wrap text-[var(--text-main)]">{post.content}</p>}
      {img && (post.media_type === 'video'
        ? <video src={img} controls preload="metadata" className="w-full max-h-[520px] bg-black border-y border-[var(--border)]" />
        : <img src={img} alt="" className="w-full max-h-[520px] object-cover border-y border-[var(--border)]" loading="lazy" />)}

      <div className="px-4 py-2 text-sm text-[var(--text-secondary)] flex justify-between">
        <span>{likes.length} likes</span>
        <button onClick={() => setOpen(!open)}>{comments.length} comments</button>
      </div>

      <div className="mx-4 border-t border-[var(--border)] py-1 grid grid-cols-3 gap-1">
        <button onClick={toggleLike} className={`btn-ghost flex items-center justify-center gap-2 ${liked ? '!text-[var(--primary)] font-semibold' : ''}`}>
          <Heart size={18} fill={liked ? 'currentColor' : 'none'} /> Like
        </button>
        <button onClick={() => setOpen(!open)} className="btn-ghost flex items-center justify-center gap-2">
          <MessageCircle size={18} /> Comment
        </button>
        <button onClick={share} className="btn-ghost flex items-center justify-center gap-2">
          <Share2 size={18} /> {copied ? 'Copied' : 'Share'}
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 pt-2 space-y-3">
          {comments.sort((a, b) => a.created_at.localeCompare(b.created_at)).map((c) => (
            <div key={c.id} className="flex gap-2">
              <Avatar address={c.author_wallet} size={30} />
              <div className="bg-[var(--bg-main)] rounded-2xl px-3 py-2 text-sm">
                <div className="font-semibold">{anonName(c.author_wallet)}</div>
                <div>{c.content}</div>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addComment()} placeholder="Write a comment…" className="input" />
            <button onClick={addComment} className="btn-primary">Send</button>
          </div>
        </div>
      )}
    </article>
  );
}
