'use client';
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, getDefaultConfig, lightTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnonProvider } from '@/components/AnonAuth';

const config = getDefaultConfig({
  appName: 'AnonBook',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'anonbook-dev',
  chains: [base], // Base mainnet, chain id 8453
  ssr: true,
});
const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={lightTheme({ accentColor: '#789580', borderRadius: 'medium' })}>
          <AnonProvider>{children}</AnonProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
