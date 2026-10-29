import type { Config } from 'tailwindcss';
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './plugins/**/*.{ts,tsx}'],
  theme: { extend: { boxShadow: { soft: '0 2px 12px rgba(41,59,50,0.08)' } } },
  plugins: [],
};
export default config;
