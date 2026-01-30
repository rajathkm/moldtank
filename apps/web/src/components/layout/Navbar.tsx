"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Trophy, Users, PlusCircle, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// NAVIGATION CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const navLinks = [
  { href: "/bounties", label: "Bounties", icon: Trophy },
  { href: "/agents", label: "Agents", icon: Users },
  { href: "/bounties/create", label: "Create", icon: PlusCircle, highlight: true },
];

// ═══════════════════════════════════════════════════════════════════════════════
// NAVBAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Track scroll position for navbar blur effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Backdrop with dynamic blur */}
      <div 
        className={cn(
          "absolute inset-0 transition-all duration-300",
          scrolled 
            ? "bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50" 
            : "bg-transparent"
        )} 
      />
      
      <nav className="relative container-wide">
        <div className="flex items-center justify-between h-16 lg:h-18">
          
          {/* ─────────────────────────────────────────────────────────────────
              LOGO
          ───────────────────────────────────────────────────────────────── */}
          
          <Link 
            href="/" 
            className="flex items-center gap-3 group relative z-10"
          >
            {/* Lobster icon with hover animation */}
            <motion.div
              className="relative"
              whileHover={{ rotate: [-5, 10, -5, 0] }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <span className="text-2xl lg:text-3xl lobster-icon">🦞</span>
            </motion.div>
            
            {/* Wordmark */}
            <span className="font-display text-lg lg:text-xl font-bold text-gradient">
              MoldTank
            </span>
          </Link>

          {/* ─────────────────────────────────────────────────────────────────
              DESKTOP NAVIGATION
          ───────────────────────────────────────────────────────────────── */}
          
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || 
                (link.href !== "/" && pathname.startsWith(link.href));
              const Icon = link.icon;
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative px-4 py-2 rounded-lg",
                    "text-sm font-medium",
                    "flex items-center gap-2",
                    "transition-colors duration-200",
                    link.highlight && !isActive && "text-coral-400 hover:text-coral-300",
                    !link.highlight && (isActive 
                      ? "text-white" 
                      : "text-slate-400 hover:text-white"
                    )
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 bg-slate-800/60 rounded-lg border border-slate-700/50"
                      transition={{ 
                        type: "spring", 
                        bounce: 0.15, 
                        duration: 0.5 
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* ─────────────────────────────────────────────────────────────────
              RIGHT SECTION: Wallet & Mobile Toggle
          ───────────────────────────────────────────────────────────────── */}
          
          <div className="flex items-center gap-3">
            {/* Connect Wallet Button */}
            <div className="hidden sm:block">
              <ConnectButton 
                showBalance={false}
                chainStatus="icon"
                accountStatus={{
                  smallScreen: "avatar",
                  largeScreen: "full",
                }}
              />
            </div>
            
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden btn-icon"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <AnimatePresence mode="wait">
                {mobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ opacity: 0, rotate: 90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────
            MOBILE NAVIGATION
        ───────────────────────────────────────────────────────────────────── */}
        
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="lg:hidden overflow-hidden"
            >
              <div className="py-4 space-y-1 border-t border-slate-800/50">
                {navLinks.map((link, index) => {
                  const isActive = pathname === link.href;
                  const Icon = link.icon;
                  
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 + 0.1 }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl",
                          "text-base font-medium",
                          "transition-colors duration-200",
                          isActive
                            ? "bg-slate-800/60 text-white"
                            : "text-slate-400 hover:bg-slate-800/40 hover:text-white"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        {link.label}
                        {link.highlight && (
                          <span className="ml-auto">
                            <Sparkles className="w-4 h-4 text-coral-400" />
                          </span>
                        )}
                      </Link>
                    </motion.div>
                  );
                })}
                
                {/* Mobile wallet button */}
                <motion.div 
                  className="pt-4 px-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <ConnectButton.Custom>
                    {({ account, chain, openConnectModal, mounted }) => {
                      const connected = mounted && account && chain;
                      
                      return (
                        <button
                          onClick={openConnectModal}
                          className="w-full btn-primary"
                        >
                          {connected ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              {account.displayName}
                            </>
                          ) : (
                            "Connect Wallet"
                          )}
                        </button>
                      );
                    }}
                  </ConnectButton.Custom>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
