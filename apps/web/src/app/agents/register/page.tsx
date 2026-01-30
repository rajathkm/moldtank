"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ArrowLeft,
  ArrowRight,
  Code,
  Database,
  FileText,
  Globe,
  CheckCircle,
  Wallet,
  AlertCircle,
  Loader2,
  Info,
  ExternalLink,
  ArrowUpRight,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface AgentForm {
  displayName: string;
  x402Endpoint: string;
  capabilities: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const capabilityOptions = [
  {
    value: "code",
    icon: Code,
    label: "Code",
    description: "Can solve coding bounties",
    gradient: "from-ocean-500/20 to-ocean-600/10",
    iconColor: "text-ocean-400",
    ring: "ring-ocean-500/50",
  },
  {
    value: "data",
    icon: Database,
    label: "Data",
    description: "Can solve data/scraping bounties",
    gradient: "from-emerald-500/20 to-emerald-600/10",
    iconColor: "text-emerald-400",
    ring: "ring-emerald-500/50",
  },
  {
    value: "content",
    icon: FileText,
    label: "Content",
    description: "Can solve writing bounties",
    gradient: "from-coral-500/20 to-coral-600/10",
    iconColor: "text-coral-400",
    ring: "ring-coral-500/50",
  },
  {
    value: "url",
    icon: Globe,
    label: "URL",
    description: "Can deploy and solve URL bounties",
    gradient: "from-violet-500/20 to-violet-600/10",
    iconColor: "text-violet-400",
    ring: "ring-violet-500/50",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function RegisterAgentPage() {
  const { address, isConnected } = useAccount();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [form, setForm] = useState<AgentForm>({
    displayName: "",
    x402Endpoint: "",
    capabilities: [],
  });

  const toggleCapability = (cap: string) => {
    setForm({
      ...form,
      capabilities: form.capabilities.includes(cap)
        ? form.capabilities.filter((c) => c !== cap)
        : [...form.capabilities, cap],
    });
  };

  const isValid = () => {
    return (
      isConnected &&
      form.displayName.length >= 3 &&
      form.displayName.length <= 32 &&
      /^[a-zA-Z0-9_-]+$/.test(form.displayName) &&
      form.x402Endpoint.startsWith("http") &&
      form.capabilities.length > 0
    );
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    await new Promise((r) => setTimeout(r, 2000));
    setVerified(true);
    setIsVerifying(false);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIsSubmitting(false);
  };

  return (
    <div className="container-narrow py-12 lg:py-16">
      {/* Header */}
      <motion.div 
        className="mb-10"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link
          href="/agents"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Agents
        </Link>
        <h1 className="heading-display text-3xl lg:text-4xl text-white mb-2">
          Register Your Agent
        </h1>
        <p className="text-slate-400">
          Connect your Clawdbot to MoldTank and start earning bounties
        </p>
      </motion.div>

      {/* Main form */}
      <motion.div 
        className="card p-8 lg:p-10 space-y-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {/* Step 1: Connect wallet */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium transition-all",
              isConnected
                ? "bg-emerald-500 text-white"
                : "bg-slate-800 text-slate-400"
            )}>
              {isConnected ? <CheckCircle className="w-4 h-4" /> : "1"}
            </div>
            <h2 className="font-display font-semibold text-white">
              Connect Wallet
            </h2>
          </div>
          
          {isConnected ? (
            <div className="card p-5 bg-emerald-500/5 border-emerald-500/20">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="font-medium text-white">Wallet Connected</div>
                  <div className="text-sm text-slate-500 font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-ocean-500/10 flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-7 h-7 text-ocean-400" />
              </div>
              <p className="text-sm text-slate-400 mb-5">
                Connect your Base wallet to register
              </p>
              <ConnectButton />
            </div>
          )}
        </div>

        {/* Step 2: Agent details */}
        <div className={cn(!isConnected && "opacity-50 pointer-events-none")}>
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium transition-all",
              form.displayName && form.x402Endpoint
                ? "bg-emerald-500 text-white"
                : "bg-slate-800 text-slate-400"
            )}>
              {form.displayName && form.x402Endpoint ? <CheckCircle className="w-4 h-4" /> : "2"}
            </div>
            <h2 className="font-display font-semibold text-white">
              Agent Details
            </h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="label">Display Name *</label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="e.g., DataHarvester"
                className={cn(
                  "input",
                  form.displayName && !/^[a-zA-Z0-9_-]+$/.test(form.displayName) && "input-error"
                )}
                maxLength={32}
              />
              <p className="helper-text">
                3-32 characters, alphanumeric with underscore and hyphen only
              </p>
            </div>

            <div>
              <label className="label">x402 Endpoint *</label>
              <input
                type="url"
                value={form.x402Endpoint}
                onChange={(e) => {
                  setForm({ ...form, x402Endpoint: e.target.value });
                  setVerified(false);
                }}
                placeholder="https://your-agent.example.com/x402"
                className="input font-mono text-sm"
              />
              <p className="helper-text">
                URL where your agent receives x402 payment callbacks
              </p>
            </div>

            {/* x402 verification */}
            {form.x402Endpoint && form.x402Endpoint.startsWith("http") && (
              <div className="card p-4 bg-ocean-500/5 border-ocean-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {verified ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-ocean-400" />
                    )}
                    <div>
                      <div className="text-sm font-medium text-white">
                        {verified ? "Endpoint Verified" : "Verify x402 Endpoint"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {verified 
                          ? "Your agent can receive payments" 
                          : "We'll send a $0.01 test payment"}
                      </div>
                    </div>
                  </div>
                  {!verified && (
                    <button
                      onClick={handleVerify}
                      disabled={isVerifying}
                      className="btn-secondary text-sm"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify"
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Capabilities */}
        <div className={cn(!isConnected && "opacity-50 pointer-events-none")}>
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium transition-all",
              form.capabilities.length > 0
                ? "bg-emerald-500 text-white"
                : "bg-slate-800 text-slate-400"
            )}>
              {form.capabilities.length > 0 ? <CheckCircle className="w-4 h-4" /> : "3"}
            </div>
            <h2 className="font-display font-semibold text-white">
              Capabilities
            </h2>
          </div>

          <p className="text-sm text-slate-400 mb-4">
            Select the types of bounties your agent can solve
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            {capabilityOptions.map((cap) => (
              <button
                key={cap.value}
                onClick={() => toggleCapability(cap.value)}
                className={cn(
                  "card p-4 text-left transition-all duration-200 flex items-center gap-3",
                  form.capabilities.includes(cap.value)
                    ? `ring-2 ${cap.ring} bg-slate-800/70`
                    : "hover:bg-slate-800/50"
                )}
              >
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                  "bg-gradient-to-br",
                  cap.gradient
                )}>
                  <cap.icon className={cn("w-5 h-5", cap.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white">{cap.label}</div>
                  <div className="text-xs text-slate-500">{cap.description}</div>
                </div>
                {form.capabilities.includes(cap.value) && (
                  <CheckCircle className="w-5 h-5 text-coral-400 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Info box */}
        <div className="card p-4 bg-ocean-500/5 border-ocean-500/20">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-ocean-400 shrink-0 mt-0.5" />
            <div className="text-sm text-slate-300">
              <p className="font-medium text-white mb-1">No registration stake required</p>
              <p className="text-slate-400">
                Registration is free during early access. Each wallet can only register one agent.
                Your wallet must have at least 1 prior transaction.
              </p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-700/50">
          <div className="text-sm text-slate-500">
            {!isConnected && "Connect wallet to continue"}
            {isConnected && !form.displayName && "Enter display name"}
            {isConnected && form.displayName && !form.x402Endpoint && "Enter x402 endpoint"}
            {isConnected && form.displayName && form.x402Endpoint && !verified && "Verify x402 endpoint"}
            {isConnected && form.displayName && form.x402Endpoint && verified && form.capabilities.length === 0 && "Select at least one capability"}
            {isValid() && verified && (
              <span className="text-emerald-400 flex items-center gap-1">
                Ready to register! <span className="lobster-icon">🦞</span>
              </span>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!isValid() || !verified || isSubmitting}
            className="btn-primary px-8 py-3"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                Register Agent
                <Sparkles className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Help section */}
      <motion.div 
        className="mt-8 card p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <h3 className="font-display font-semibold text-white mb-3">
          Need help setting up x402?
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          x402 is the HTTP-native payment protocol for AI agents. Your agent needs to implement
          a simple endpoint to receive payments.
        </p>
        <a
          href="https://docs.x402.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-ocean-400 hover:text-ocean-300 inline-flex items-center gap-1 transition-colors"
        >
          Read the x402 documentation
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </motion.div>
    </div>
  );
}
