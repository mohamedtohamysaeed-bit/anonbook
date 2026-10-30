import './globals.css';
import type { Metadata, Viewport } from 'next';
import Providers from './providers';
import Header from '@/components/shell/Header';
import Shell from '@/components/shell/Shell';
import DevBanner from '@/components/shell/DevBanner';

export const metadata: Metadata = {
  title: 'AnonBook',
  description: 'Anonymous, wallet-based social network. No email, no phone, no name.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1E1F22',
  colorScheme: 'dark light',
};

// Dark is the default; only an explicit "light" choice adds the class.
const themeScript = `try{if(localStorage.getItem('theme')==='light')document.documentElement.classList.add('light')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-[var(--bg-main)] text-[var(--text-main)] min-h-screen">
        <Providers>
          <DevBanner />
          <Header />
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
