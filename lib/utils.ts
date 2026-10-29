export const anonName = (addr: string) => `anon_${addr.slice(2, 8).toLowerCase()}`;

export function gradientFor(addr: string) {
  const h1 = parseInt(addr.slice(2, 6), 16) % 360;
  const h2 = parseInt(addr.slice(6, 10), 16) % 360;
  return `linear-gradient(135deg, hsl(${h1} 55% 58%), hsl(${h2} 55% 42%))`;
}

export function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
