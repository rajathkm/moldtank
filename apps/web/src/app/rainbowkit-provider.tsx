"use client";

import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { type ReactNode } from "react";

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

export default function RainbowKitProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <RainbowKitProvider theme={customTheme} modalSize="compact">
      {children}
    </RainbowKitProvider>
  );
}
