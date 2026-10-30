import registry from '@/plugins/plugin-registry.json';

export type NavItem = { label: string; icon: string; href: string };

// Plugins that declare a route add themselves to the navigation.
const pluginNav: NavItem[] = registry.plugins
  .filter((p) => p.enabled && p.route)
  .map((p) => ({ label: p.label as string, icon: p.icon as string, href: p.route as string }));

export const SIDEBAR_ITEMS: NavItem[] = [
  { label: 'Friends', icon: 'Users', href: '#' },
  { label: 'Groups', icon: 'UsersRound', href: '#' },
  ...pluginNav,
  { label: 'Watch', icon: 'Clapperboard', href: '#' },
];

export const BOTTOM_ITEMS: NavItem[] = [{ label: 'Home', icon: 'Home', href: '/' }, ...SIDEBAR_ITEMS];

export const isActive = (path: string, href: string) => (href === '#' ? false : href === '/' ? path === '/' : path.startsWith(href));
