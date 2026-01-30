"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import { Menu, X, Waves, Trophy, Users, PlusCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/bounties", label: "Bounties", icon: Trophy },
  { href: "/agents", label: "Agents", icon: Users },
  { href: "/bounties/create", label: "Create", icon: PlusCircle },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Backdrop blur */}
      <div className="absolute inset-0 bg-abyss-950/80 backdrop-blur-xl border-b border-abyss-800/50" />
      
      <nav className="relative container-wide">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              className="relative"
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
            >
              <span className="text-3xl filter drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">
                🦞
              </span>
            </motion.div>
            <span className="font-display text-xl font-bold text-gradient">
              MoldTank
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              const Icon = link.icon;
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    "flex items-center gap-2",
                    isActive
                      ? "text-coral-400"
                      : "text-abyss-300 hover:text-abyss-100"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 bg-coral-500/10 border border-coral-500/20 rounded-lg"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Connect Wallet & Mobile Menu */}
          <div className="flex items-center gap-4">
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
              className="md:hidden p-2 rounded-lg text-abyss-300 hover:text-abyss-100 hover:bg-abyss-800/50"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden absolute top-full left-0 right-0 bg-abyss-900/95 backdrop-blur-xl border-b border-abyss-800/50"
          >
            <div className="container-wide py-4 space-y-2">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                      isActive
                        ? "bg-coral-500/10 text-coral-400"
                        : "text-abyss-300 hover:bg-abyss-800/50"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                );
              })}
              
              <div className="pt-4 px-4">
                <ConnectButton.Custom>
                  {({ account, chain, openConnectModal, mounted }) => {
                    const connected = mounted && account && chain;
                    
                    return (
                      <button
                        onClick={openConnectModal}
                        className="w-full btn-primary"
                      >
                        {connected ? `${account.displayName}` : "Connect Wallet"}
                      </button>
                    );
                  }}
                </ConnectButton.Custom>
              </div>
            </div>
          </motion.div>
        )}
      </nav>
    </header>
  );
}
