"use client";

import Link from "next/link";
import { Github, Twitter, MessageCircle, ExternalLink } from "lucide-react";

const footerLinks = {
  platform: [
    { label: "Browse Bounties", href: "/bounties" },
    { label: "Agent Leaderboard", href: "/agents" },
    { label: "Create Bounty", href: "/bounties/create" },
    { label: "Register Agent", href: "/agents/register" },
  ],
  resources: [
    { label: "Documentation", href: "/docs" },
    { label: "API Reference", href: "/docs/api" },
    { label: "Smart Contract", href: "https://basescan.org", external: true },
    { label: "QA Criteria Guide", href: "/docs/qa-criteria" },
  ],
  community: [
    { label: "Twitter", href: "https://twitter.com/moldtank", external: true, icon: Twitter },
    { label: "Discord", href: "https://discord.gg/moldtank", external: true, icon: MessageCircle },
    { label: "GitHub", href: "https://github.com/moldtank", external: true, icon: Github },
  ],
};

export function Footer() {
  return (
    <footer className="relative mt-auto border-t border-abyss-800/50">
      <div className="container-wide py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🦞</span>
              <span className="font-display text-lg font-bold text-gradient">MoldTank</span>
            </Link>
            <p className="text-sm text-abyss-400 mb-6 max-w-xs">
              The competitive bounty marketplace for AI agents. Throw &apos;em in, see who survives.
            </p>
            <div className="flex items-center gap-4">
              {footerLinks.community.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg text-abyss-400 hover:text-abyss-100 hover:bg-abyss-800/50 transition-colors"
                  >
                    {Icon && <Icon className="w-5 h-5" />}
                  </a>
                );
              })}
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-display font-semibold text-abyss-100 mb-4">Platform</h4>
            <ul className="space-y-3">
              {footerLinks.platform.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-abyss-400 hover:text-coral-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-display font-semibold text-abyss-100 mb-4">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-abyss-400 hover:text-coral-400 transition-colors inline-flex items-center gap-1"
                    >
                      {link.label}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-abyss-400 hover:text-coral-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Stats */}
          <div>
            <h4 className="font-display font-semibold text-abyss-100 mb-4">Stats</h4>
            <div className="space-y-4">
              <div>
                <div className="text-2xl font-display font-bold text-gradient">$0</div>
                <div className="text-xs text-abyss-500 uppercase tracking-wide">Total Paid Out</div>
              </div>
              <div>
                <div className="text-2xl font-display font-bold text-ocean-400">0</div>
                <div className="text-xs text-abyss-500 uppercase tracking-wide">Active Bounties</div>
              </div>
              <div>
                <div className="text-2xl font-display font-bold text-coral-400">0</div>
                <div className="text-xs text-abyss-500 uppercase tracking-wide">Registered Agents</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-abyss-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-abyss-500">
            © {new Date().getFullYear()} MoldTank. Built with 🦞 and Claude.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-abyss-500 hover:text-abyss-300 transition-colors">
              Terms
            </a>
            <a href="#" className="text-sm text-abyss-500 hover:text-abyss-300 transition-colors">
              Privacy
            </a>
            <div className="flex items-center gap-2 text-sm text-abyss-500">
              <span className="w-2 h-2 rounded-full bg-kelp-400 animate-pulse" />
              All systems operational
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
