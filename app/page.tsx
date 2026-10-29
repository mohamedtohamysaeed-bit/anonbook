import { Suspense } from 'react';
import Feed from '@/components/feed/Feed';

export default function Home() {
  return (
    <Suspense fallback={null}>
      <Feed />
    </Suspense>
  );
}
