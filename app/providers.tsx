'use client';
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit';
import { injectedWallet } from '@rainbow-me/rainbowkit/wallets';
import { WagmiProvider } from 'wagmi';
import { base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnonProvider } from '@/components/AnonAuth';
import { ENV } from '@/lib/env';

// Without a WalletConnect Project ID the connect modal offers browser wallets only (a fake id would make every
// WalletConnect wallet fail). The built-in anonymous burner wallet works either way. A yellow banner explains it.
const config = getDefaultConfig({
  appName: 'AnonBook',
  projectId: ENV.wcProjectId || 'anonbook-no-project-id',
  chains: [base], // Base mainnet, chain id 8453
  ssr: true,
  ...(ENV.wcProjectId ? {} : { wallets: [{ groupName: 'Browser wallets', wallets: [injectedWallet] }] }),
});
const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: '#5865F2', accentColorForeground: 'white', borderRadius: 'small', overlayBlur: 'small' })}>
          <AnonProvider>{children}</AnonProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
