import { gradientFor } from '@/lib/utils';

export default function Avatar({ address, size = 40 }: { address?: string | null; size?: number }) {
  return (
    <div
      className="rounded-full shrink-0 border border-[var(--border)]"
      style={{ width: size, height: size, background: address ? gradientFor(address) : 'var(--border)' }}
    />
  );
}
