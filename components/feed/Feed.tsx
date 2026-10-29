'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { db, Row } from '@/lib/db';
import StoriesBar from './StoriesBar';
import CreatePost from './CreatePost';
import PostCard from './PostCard';

export default function Feed() {
  const q = (useSearchParams().get('q') || '').toLowerCase();
  const [posts, setPosts] = useState<Row[]>([]);
  const [likes, setLikes] = useState<Row[]>([]);
  const [comments, setComments] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [p, l, c] = await Promise.all([db.select('posts', { order: 'created_at', limit: 50 }), db.select('likes'), db.select('comments')]);
      setPosts(p); setLikes(l); setComments(c);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = q ? posts.filter((p) => (p.content || '').toLowerCase().includes(q)) : posts;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <StoriesBar />
      <CreatePost onPosted={load} />
      {loading && <p className="text-center text-[var(--text-secondary)]">Loading…</p>}
      {!loading && visible.length === 0 && (
        <div className="card p-8 text-center text-[var(--text-secondary)]">
          {q ? `No posts match "${q}".` : 'No posts yet. Share the first one above.'}
        </div>
      )}
      {visible.map((p) => (
        <PostCard key={p.id} post={p} likes={likes.filter((l) => l.post_id === p.id)} comments={comments.filter((c) => c.post_id === p.id)} onChange={load} />
      ))}
    </div>
  );
}
