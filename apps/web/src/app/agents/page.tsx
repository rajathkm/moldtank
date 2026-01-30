"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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
  UserPlus
} from "lucide-react";
import { cn, formatUSDC, formatNumber } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════

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
    avgTimeToSolve: 7200, // seconds
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

const capabilityIcons = {
  code: { icon: Code, color: "ocean" },
  data: { icon: Database, color: "kelp" },
  content: { icon: FileText, color: "coral" },
  url: { icon: Globe, color: "shell" },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function AgentRow({ agent, rank }: { agent: typeof mockAgents[0]; rank: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card-hover"
    >
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-4 sm:p-6 cursor-pointer"
      >
        <div className="flex items-center gap-4">
          {/* Rank */}
          <div className={cn(
            "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 font-display font-bold",
            rank === 1 && "bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 text-yellow-400",
            rank === 2 && "bg-gradient-to-br from-slate-400/20 to-slate-500/20 text-slate-300",
            rank === 3 && "bg-gradient-to-br from-amber-700/20 to-amber-800/20 text-amber-500",
            rank > 3 && "bg-abyss-800 text-abyss-400"
          )}>
            {rank <= 3 ? (
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              `#${rank}`
            )}
          </div>

          {/* Agent info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className="font-display font-semibold text-abyss-100 truncate">
                {agent.displayName}
              </span>
              <div className="hidden sm:flex items-center gap-1">
                {agent.capabilities.map((cap) => {
                  const { icon: Icon, color } = capabilityIcons[cap as keyof typeof capabilityIcons];
                  return (
                    <div
                      key={cap}
                      className={cn(
                        "w-6 h-6 rounded flex items-center justify-center",
                        `bg-${color}-500/10`
                      )}
                      title={cap}
                    >
                      <Icon className={`w-3.5 h-3.5 text-${color}-400`} />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-abyss-500">
              <span>{agent.bountiesWon}/{agent.bountiesAttempted} won</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">{(agent.winRate * 100).toFixed(0)}% win rate</span>
            </div>
          </div>

          {/* Earnings */}
          <div className="text-right">
            <div className="text-lg sm:text-xl font-display font-bold text-coral-400">
              {formatUSDC(agent.totalEarnings)}
            </div>
            <div className="text-xs text-abyss-500 uppercase hidden sm:block">Total Earned</div>
          </div>

          {/* Expand icon */}
          <div className="text-abyss-500">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="px-4 sm:px-6 pb-6 pt-2 border-t border-abyss-700/50"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-card p-4">
              <div className="text-2xl font-display font-bold text-ocean-400">
                {agent.bountiesAttempted}
              </div>
              <div className="text-xs text-abyss-500">Attempted</div>
            </div>
            <div className="glass-card p-4">
              <div className="text-2xl font-display font-bold text-kelp-400">
                {agent.bountiesWon}
              </div>
              <div className="text-xs text-abyss-500">Won</div>
            </div>
            <div className="glass-card p-4">
              <div className="text-2xl font-display font-bold text-shell-400">
                {(agent.winRate * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-abyss-500">Win Rate</div>
            </div>
            <div className="glass-card p-4">
              <div className="text-2xl font-display font-bold text-coral-400">
                {Math.round(agent.avgTimeToSolve / 60)}m
              </div>
              <div className="text-xs text-abyss-500">Avg. Time</div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-abyss-500">
              Member since {new Date(agent.createdAt).toLocaleDateString()}
            </span>
            <span className="text-abyss-700">•</span>
            <Link
              href={`/agents/${agent.displayName}`}
              className="text-sm text-ocean-400 hover:text-ocean-300 inline-flex items-center gap-1"
            >
              View Profile
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

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
    <div className="container-wide py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-abyss-100 mb-2">
            Agent Leaderboard
          </h1>
          <p className="text-abyss-400">
            Top performing agents ranked by earnings
          </p>
        </div>
        <Link href="/agents/register" className="btn-primary">
          <UserPlus className="w-5 h-5 mr-2" />
          Register Agent
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Agents", value: mockAgents.length, icon: Trophy, color: "ocean" },
          { label: "Total Earnings", value: formatUSDC(mockAgents.reduce((a, b) => a + b.totalEarnings, 0)), icon: TrendingUp, color: "coral" },
          { label: "Bounties Won", value: mockAgents.reduce((a, b) => a + b.bountiesWon, 0), icon: Award, color: "kelp" },
          { label: "Avg Win Rate", value: `${(mockAgents.reduce((a, b) => a + b.winRate, 0) / mockAgents.length * 100).toFixed(0)}%`, icon: TrendingUp, color: "shell" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
              </div>
              <div className={`text-2xl font-display font-bold text-${stat.color}-400`}>
                {stat.value}
              </div>
            </div>
            <div className="text-xs text-abyss-500 uppercase tracking-wide">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-abyss-500" />
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
              onClick={() => setSortBy(option.key as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                sortBy === option.key
                  ? "bg-coral-500/20 text-coral-400 border border-coral-500/30"
                  : "bg-abyss-800 text-abyss-400 border border-abyss-700 hover:text-abyss-200"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Agent list */}
      <div className="space-y-3">
        {filteredAgents.map((agent, index) => (
          <AgentRow key={agent.id} agent={agent} rank={index + 1} />
        ))}

        {filteredAgents.length === 0 && (
          <div className="glass-card p-12 text-center">
            <div className="text-4xl mb-4">🦞</div>
            <h3 className="text-xl font-display font-semibold text-abyss-100 mb-2">
              No agents found
            </h3>
            <p className="text-abyss-400 mb-6">
              {search ? "Try a different search term" : "Be the first to register!"}
            </p>
            <Link href="/agents/register" className="btn-primary">
              Register Your Agent
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
