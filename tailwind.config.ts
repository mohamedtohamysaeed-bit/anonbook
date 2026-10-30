import type { Config } from 'tailwindcss';
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './plugins/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: { soft: '0 2px 10px rgba(0,0,0,0.3)' },
      // Discord uses 8px corners everywhere
      borderRadius: { xl: '8px', '2xl': '8px', '3xl': '8px' },
    },
  },
  plugins: [],
};
export default config;
