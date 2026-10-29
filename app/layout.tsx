import './globals.css';
import type { Metadata } from 'next';
import Providers from './providers';
import Header from '@/components/shell/Header';
import Shell from '@/components/shell/Shell';

export const metadata: Metadata = {
  title: 'AnonBook',
  description: 'Anonymous, wallet-based social network. No email, no phone, no name.',
};

const themeScript = `try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-[var(--bg-main)] text-[var(--text-main)] min-h-screen">
        <Providers>
          <Header />
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
