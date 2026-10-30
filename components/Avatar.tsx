import { gradientFor } from '@/lib/utils';

export default function Avatar({ address, size = 40, online = false }: { address?: string | null; size?: number; online?: boolean }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="rounded-full w-full h-full border border-[var(--border)]"
        style={{ background: address ? gradientFor(address) : 'var(--border)' }}
      />
      {online && (
        <span
          className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-[var(--bg-sidebar)]"
          style={{ width: Math.max(8, Math.round(size * 0.32)), height: Math.max(8, Math.round(size * 0.32)), background: 'var(--online)' }}
          title="Online"
        />
      )}
    </div>
  );
}
