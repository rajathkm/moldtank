"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";

// Dynamically import RainbowKit to avoid SSR localStorage issues
const RainbowKitProviderWrapper = dynamic(
  () => import("./rainbowkit-provider"),
  { ssr: false }
);

// ═══════════════════════════════════════════════════════════════
// WAGMI CONFIG
// ═══════════════════════════════════════════════════════════════

const config = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
});

// ═══════════════════════════════════════════════════════════════
// PROVIDERS
// ═══════════════════════════════════════════════════════════════

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProviderWrapper>{children}</RainbowKitProviderWrapper>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
