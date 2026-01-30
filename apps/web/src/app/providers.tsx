"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { useState, useEffect, type ReactNode } from "react";

// ═══════════════════════════════════════════════════════════════
// WAGMI CONFIG
// ═══════════════════════════════════════════════════════════════

const config = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true, // Enable SSR-safe mode
});

// ═══════════════════════════════════════════════════════════════
// RAINBOWKIT THEME
// ═══════════════════════════════════════════════════════════════

const moldTankTheme = darkTheme({
  accentColor: "#f97316", // coral-500
  accentColorForeground: "white",
  borderRadius: "large",
  fontStack: "system",
  overlayBlur: "small",
});

// Custom overrides
const customTheme = {
  ...moldTankTheme,
  colors: {
    ...moldTankTheme.colors,
    modalBackground: "rgba(15, 23, 42, 0.95)",
    modalBorder: "rgba(51, 65, 85, 0.5)",
    profileForeground: "rgba(15, 23, 42, 0.95)",
    menuItemBackground: "rgba(30, 41, 59, 0.5)",
    connectButtonBackground: "rgba(30, 41, 59, 0.8)",
    connectButtonInnerBackground: "rgba(15, 23, 42, 0.9)",
  },
  shadows: {
    ...moldTankTheme.shadows,
    dialog: "0 8px 40px rgba(0, 0, 0, 0.5)",
  },
};

// ═══════════════════════════════════════════════════════════════
// PROVIDERS
// ═══════════════════════════════════════════════════════════════

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={customTheme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
