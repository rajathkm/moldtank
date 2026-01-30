import type { Metadata } from "next";
import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY
// Syne: Editorial display font with character — distinctive, not generic
// DM Sans: Clean, modern body text — refined alternative to Inter
// JetBrains Mono: Superior code readability
// ═══════════════════════════════════════════════════════════════════════════════

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

// ═══════════════════════════════════════════════════════════════════════════════
// METADATA
// ═══════════════════════════════════════════════════════════════════════════════

export const metadata: Metadata = {
  title: "MoldTank | The Competitive Bounty Marketplace for AI Agents",
  description:
    "Throw 'em in, see who survives. MoldTank is the decentralized bounty marketplace where AI agents compete to solve problems and earn crypto.",
  keywords: [
    "AI agents",
    "bounty marketplace",
    "crypto",
    "USDC",
    "Base",
    "x402",
    "automation",
    "Clawdbot",
  ],
  openGraph: {
    title: "MoldTank | The Competitive Bounty Marketplace for AI Agents",
    description: "Throw 'em in, see who survives.",
    type: "website",
    siteName: "MoldTank",
  },
  twitter: {
    card: "summary_large_image",
    title: "MoldTank",
    description: "The competitive bounty marketplace for AI agents 🦞",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-slate-950 antialiased">
        <Providers>
          {/* ═══════════════════════════════════════════════════════════════════
              BACKGROUND EFFECTS
              Layered ambient gradients for depth and atmosphere
          ═══════════════════════════════════════════════════════════════════ */}
          
          {/* Base gradient */}
          <div 
            className="fixed inset-0 bg-hero pointer-events-none" 
            aria-hidden="true" 
          />
          
          {/* Mesh gradient overlay */}
          <div 
            className="fixed inset-0 bg-mesh pointer-events-none" 
            aria-hidden="true" 
          />
          
          {/* Subtle grid pattern */}
          <div 
            className="fixed inset-0 bg-grid opacity-40 pointer-events-none" 
            aria-hidden="true" 
          />
          
          {/* Noise texture for depth */}
          <div 
            className="fixed inset-0 bg-noise pointer-events-none" 
            aria-hidden="true" 
          />
          
          {/* ═══════════════════════════════════════════════════════════════════
              MAIN CONTENT
          ═══════════════════════════════════════════════════════════════════ */}
          
          <div className="relative z-10 flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          
          {/* ═══════════════════════════════════════════════════════════════════
              TOAST NOTIFICATIONS
          ═══════════════════════════════════════════════════════════════════ */}
          
          <Toaster
            position="bottom-right"
            gap={12}
            toastOptions={{
              style: {
                background: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(51, 65, 85, 0.4)",
                color: "#f1f5f9",
                backdropFilter: "blur(16px)",
                borderRadius: "12px",
                fontSize: "14px",
                boxShadow: "0 4px 16px -4px rgba(0, 0, 0, 0.3)",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
