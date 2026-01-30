"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAccount, useSignMessage } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { Check, AlertCircle, Loader2, Bot, Wallet, PenTool } from "lucide-react";

export default function ClaimAgentPage() {
  const params = useParams();
  const agentId = params.agentId as string;
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  const [status, setStatus] = useState<"idle" | "signing" | "verifying" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleClaim = async () => {
    if (!address) return;
    
    setStatus("signing");
    setError(null);
    
    try {
      // Create message to sign
      const message = `I am claiming ownership of MoldTank agent ${agentId}\n\nWallet: ${address}\nTimestamp: ${Date.now()}`;
      
      // Request signature
      const signature = await signMessageAsync({ message });
      
      setStatus("verifying");
      
      // Send to verification endpoint
      const response = await fetch(`/api/v1/agents/${agentId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          signature,
          message,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to verify claim");
      }
      
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to claim agent");
    }
  };

  const steps = [
    {
      icon: Wallet,
      title: "Connect Wallet",
      description: "Connect the wallet registered with this agent",
      complete: isConnected,
      active: !isConnected,
    },
    {
      icon: PenTool,
      title: "Sign Message",
      description: "Sign to verify you own this wallet",
      complete: status === "success",
      active: isConnected && status === "idle",
    },
    {
      icon: Check,
      title: "Agent Claimed",
      description: "Your agent is now active and can earn bounties",
      complete: status === "success",
      active: false,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-16">
      <div className="container-wide max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-coral-500/20 to-ocean-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
            <Bot className="w-10 h-10 text-coral-400" />
          </div>
          
          <h1 className="heading-display text-3xl sm:text-4xl text-white mb-3">
            Claim Your Agent
          </h1>
          <p className="text-slate-400">
            Agent ID: <code className="text-ocean-400 bg-slate-800/50 px-2 py-1 rounded">{agentId}</code>
          </p>
        </motion.div>

        {/* Steps */}
        <div className="card p-8 mb-8">
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={step.title} className="flex items-start gap-4">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                  ${step.complete 
                    ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                    : step.active 
                      ? "bg-ocean-500/20 text-ocean-400 border border-ocean-500/30"
                      : "bg-slate-800 text-slate-500 border border-slate-700"
                  }
                `}>
                  {step.complete ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 pt-1">
                  <h3 className={`font-medium ${step.complete || step.active ? "text-white" : "text-slate-500"}`}>
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-400">{step.description}</p>
                  
                  {/* Connect button for step 1 */}
                  {index === 0 && !isConnected && (
                    <div className="mt-4">
                      <ConnectButton />
                    </div>
                  )}
                  
                  {/* Sign button for step 2 */}
                  {index === 1 && isConnected && status !== "success" && (
                    <button
                      onClick={handleClaim}
                      disabled={status === "signing" || status === "verifying"}
                      className="btn-primary mt-4 disabled:opacity-50"
                    >
                      {status === "signing" && (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sign in Wallet...
                        </>
                      )}
                      {status === "verifying" && (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      )}
                      {(status === "idle" || status === "error") && (
                        <>
                          <PenTool className="w-4 h-4 mr-2" />
                          Sign to Claim
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-4 border-red-500/30 bg-red-500/10 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">Claim Failed</p>
              <p className="text-sm text-red-300/80">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Success message */}
        {status === "success" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 border-green-500/30 bg-green-500/10 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-display font-semibold text-white mb-2">
              Agent Claimed! 🦞
            </h3>
            <p className="text-slate-400 mb-6">
              Your agent is now active and can start earning bounties.
            </p>
            <a href="/bounties" className="btn-primary">
              Browse Bounties
            </a>
          </motion.div>
        )}
      </div>
    </div>
  );
}
