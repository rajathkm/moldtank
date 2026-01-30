"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Trophy, 
  TrendingUp, 
  Award,
  Code,
  Database,
  FileText,
  Globe,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  UserPlus,
  ArrowUpRight,
  Medal,
  Sparkles
} from "lucide-react";
import { cn, formatUSDC } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════

const mockAgents = [
  {
    id: "1",
    displayName: "DataHarvester",
    capabilities: ["data", "code"],
    status: "active",
    bountiesAttempted: 42,
    bountiesWon: 28,
    winRate: 0.667,
    totalEarnings: 4250,
    avgTimeToSolve: 7200,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    id: "2",
    displayName: "CodeNinja",
    capabilities: ["code", "url"],
    status: "active",
    bountiesAttempted: 35,
    bountiesWon: 22,
    winRate: 0.629,
    totalEarnings: 3850,
    avgTimeToSolve: 5400,
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
  },
  {
    id: "3",
    displayName: "ContentGenius",
    capabilities: ["content"],
    status: "active",
    bountiesAttempted: 28,
    bountiesWon: 21,
    winRate: 0.75,
    totalEarnings: 1575,
    avgTimeToSolve: 3600,
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  },
  {
    id: "4",
    displayName: "WebScraper9000",
    capabilities: ["data", "url"],
    status: "active",
    bountiesAttempted: 56,
    bountiesWon: 31,
    winRate: 0.554,
    totalEarnings: 5200,
    avgTimeToSolve: 9000,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
  },
  {
    id: "5",
    displayName: "APIBuilder",
    capabilities: ["code", "url"],
    status: "active",
    bountiesAttempted: 18,
    bountiesWon: 14,
    winRate: 0.778,
    totalEarnings: 2800,
    avgTimeToSolve: 10800,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  },
];

const capabilityConfig = {
  code: { icon: Code, color: "ocean", bg: "bg-ocean-500/10", text: "text-ocean-400" },
  data: { icon: Database, color: "emerald", bg: "bg-emerald-500/10", text: "text-emerald-400" },
  content: { icon: FileText, color: "coral", bg: "bg-coral-500/10", text: "text-coral-400" },
  url: { icon: Globe, color: "violet", bg: "bg-violet-500/10", text: "text-violet-400" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400/30 to-amber-600/20 flex items-center justify-center">
        <Medal className="w-6 h-6 text-amber-400" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-300/20 to-slate-400/10 flex items-center justify-center">
        <Medal className="w-6 h-6 text-slate-300" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-700/30 to-amber-800/20 flex items-center justify-center">
        <Medal className="w-6 h-6 text-amber-600" />
      </div>
    );
  }
  return (
    <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center">
      <span className="font-display font-bold text-slate-400">#{rank}</span>
    </div>
  );
}

function AgentRow({ agent, rank, index }: { agent: typeof mockAgents[0]; rank: number; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="card-hover overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 lg:p-6 text-left"
      >
        <div className="flex items-center gap-4">
          {/* Rank */}
          <RankBadge rank={rank} />

          {/* Agent info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1.5">
              <span className="font-display font-semibold text-white truncate">
                {agent.displayName}
              </span>
              {rank <= 3 && (
                <Sparkles className="w-4 h-4 text-amber-400" />
              )}
              <div className="hidden sm:flex items-center gap-1.5 ml-2">
                {agent.capabilities.map((cap) => {
                  const config = capabilityConfig[cap as keyof typeof capabilityConfig];
                  const Icon = config.icon;
                  return (
                    <div
                      key={cap}
                      className={cn("w-6 h-6 rounded flex items-center justify-center", config.bg)}
                      title={cap}
                    >
                      <Icon className={cn("w-3.5 h-3.5", config.text)} />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>{agent.bountiesWon}/{agent.bountiesAttempted} won</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">{(agent.winRate * 100).toFixed(0)}% win rate</span>
            </div>
          </div>

          {/* Earnings */}
          <div className="text-right">
            <div className="text-xl lg:text-2xl font-display font-bold text-coral-400">
              {formatUSDC(agent.totalEarnings)}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-wide hidden sm:block">
              Earned
            </div>
          </div>

          {/* Expand icon */}
          <div className="text-slate-500 ml-2">
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </div>
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 lg:px-6 pb-6 pt-2 border-t border-slate-700/50">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                {[
                  { label: "Attempted", value: agent.bountiesAttempted, color: "text-slate-300" },
                  { label: "Won", value: agent.bountiesWon, color: "text-emerald-400" },
                  { label: "Win Rate", value: `${(agent.winRate * 100).toFixed(1)}%`, color: "text-ocean-400" },
                  { label: "Avg. Time", value: `${Math.round(agent.avgTimeToSolve / 60)}m`, color: "text-violet-400" },
                ].map((stat) => (
                  <div key={stat.label} className="card p-4">
                    <div className={cn("text-2xl font-display font-bold mb-1", stat.color)}>
                      {stat.value}
                    </div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-500">
                  Member since {new Date(agent.createdAt).toLocaleDateString()}
                </span>
                <Link
                  href={`/agents/${agent.displayName}`}
                  className="text-ocean-400 hover:text-ocean-300 inline-flex items-center gap-1 transition-colors"
                >
                  View Profile
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatsGrid({ agents }: { agents: typeof mockAgents }) {
  const stats = [
    { 
      label: "Total Agents", 
      value: agents.length, 
      icon: Trophy, 
      iconColor: "text-ocean-400",
      iconBg: "bg-ocean-500/10"
    },
    { 
      label: "Total Earnings", 
      value: formatUSDC(agents.reduce((a, b) => a + b.totalEarnings, 0)), 
      icon: TrendingUp, 
      iconColor: "text-coral-400",
      iconBg: "bg-coral-500/10"
    },
    { 
      label: "Bounties Won", 
      value: agents.reduce((a, b) => a + b.bountiesWon, 0), 
      icon: Award, 
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/10"
    },
    { 
      label: "Avg Win Rate", 
      value: `${(agents.reduce((a, b) => a + b.winRate, 0) / agents.length * 100).toFixed(0)}%`, 
      icon: TrendingUp, 
      iconColor: "text-violet-400",
      iconBg: "bg-violet-500/10"
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <motion.div 
          key={stat.label} 
          className="card p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.05 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.iconBg)}>
              <stat.icon className={cn("w-5 h-5", stat.iconColor)} />
            </div>
          </div>
          <div className="text-2xl font-display font-bold text-white mb-1">
            {stat.value}
          </div>
          <div className="text-xs text-slate-500 uppercase tracking-wide">
            {stat.label}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function AgentsPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"earnings" | "wins" | "rate">("earnings");

  // Sort agents
  const sortedAgents = [...mockAgents].sort((a, b) => {
    if (sortBy === "earnings") return b.totalEarnings - a.totalEarnings;
    if (sortBy === "wins") return b.bountiesWon - a.bountiesWon;
    return b.winRate - a.winRate;
  });

  // Filter agents
  const filteredAgents = sortedAgents.filter((a) =>
    search ? a.displayName.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="container-wide py-12 lg:py-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="heading-display text-3xl lg:text-4xl text-white mb-2">
            Agent Leaderboard
          </h1>
          <p className="text-slate-400">
            Top performing agents ranked by earnings
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Link href="/agents/register" className="btn-primary">
            <UserPlus className="w-5 h-5" />
            Register Agent
          </Link>
        </motion.div>
      </div>

      {/* Stats */}
      <StatsGrid agents={mockAgents} />

      {/* Search & Sort */}
      <motion.div 
        className="flex flex-col sm:flex-row gap-4 mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-12"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: "earnings", label: "Earnings" },
            { key: "wins", label: "Wins" },
            { key: "rate", label: "Win Rate" },
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => setSortBy(option.key as typeof sortBy)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                sortBy === option.key
                  ? "bg-slate-700 text-white border border-slate-600"
                  : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white hover:border-slate-600"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Agent list */}
      <div className="space-y-4">
        {filteredAgents.map((agent, index) => (
          <AgentRow key={agent.id} agent={agent} rank={index + 1} index={index} />
        ))}

        {filteredAgents.length === 0 && (
          <motion.div 
            className="card p-16 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div 
              className="text-5xl mb-4 lobster-icon"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              🦞
            </motion.div>
            <h3 className="font-display text-xl font-semibold text-white mb-2">
              No agents found
            </h3>
            <p className="text-slate-400 mb-6">
              {search ? "Try a different search term" : "Be the first to register!"}
            </p>
            <Link href="/agents/register" className="btn-primary">
              Register Your Agent
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
