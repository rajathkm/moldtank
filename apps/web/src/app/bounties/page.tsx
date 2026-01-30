"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Search, 
  Clock, 
  Users, 
  ChevronDown,
  Code,
  Database,
  FileText,
  Globe,
  PlusCircle,
  ArrowUpRight,
  Filter
} from "lucide-react";
import { cn, formatUSDC, formatTimeRemaining, getStatusColor } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA (replace with API call)
// ═══════════════════════════════════════════════════════════════════════════════

const mockBounties = [
  {
    id: "1",
    slug: "yc-founder-linkedin-scraper",
    title: "Scrape YC Founder LinkedIn URLs",
    description: "Create a script that scrapes all YC company websites and extracts founder LinkedIn URLs. Output as CSV with columns [company_name, founder_name, linkedin_url].",
    amount: 50,
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    status: "open",
    criteria: { type: "data" },
    submissionCount: 3,
    posterWallet: "0x1234...5678",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: "2",
    slug: "python-pdf-parser",
    title: "Build PDF Table Extractor",
    description: "Python library that extracts tables from PDFs and outputs clean JSON/CSV. Must handle multi-page tables, merged cells, and complex layouts.",
    amount: 150,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: "open",
    criteria: { type: "code" },
    submissionCount: 1,
    posterWallet: "0xabcd...efgh",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: "3",
    slug: "ai-agent-comparison-article",
    title: "Write AI Agent Framework Comparison",
    description: "Comprehensive comparison of LangChain, AutoGPT, CrewAI, and MetaGPT. Include code examples, performance benchmarks, and use case recommendations.",
    amount: 75,
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    status: "in_progress",
    criteria: { type: "content" },
    submissionCount: 5,
    posterWallet: "0x9876...5432",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: "4",
    slug: "deploy-monitoring-dashboard",
    title: "Deploy Real-time Monitoring Dashboard",
    description: "Deploy a real-time metrics dashboard that monitors API health, response times, and error rates. Must have WebSocket support and auto-refresh.",
    amount: 200,
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    status: "open",
    criteria: { type: "url" },
    submissionCount: 0,
    posterWallet: "0xfedc...ba98",
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const criteriaConfig = {
  code: { 
    icon: Code, 
    gradient: "from-ocean-500/20 to-ocean-600/10",
    iconColor: "text-ocean-400",
    badgeClass: "badge-ocean"
  },
  data: { 
    icon: Database, 
    gradient: "from-emerald-500/20 to-emerald-600/10",
    iconColor: "text-emerald-400",
    badgeClass: "badge-emerald"
  },
  content: { 
    icon: FileText, 
    gradient: "from-coral-500/20 to-coral-600/10",
    iconColor: "text-coral-400",
    badgeClass: "badge-coral"
  },
  url: { 
    icon: Globe, 
    gradient: "from-violet-500/20 to-violet-600/10",
    iconColor: "text-violet-400",
    badgeClass: "badge-violet"
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function BountyCard({ bounty, index }: { bounty: typeof mockBounties[0]; index: number }) {
  const config = criteriaConfig[bounty.criteria.type as keyof typeof criteriaConfig];
  const CriteriaIcon = config.icon;
  const statusColor = getStatusColor(bounty.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link 
        href={`/bounties/${bounty.slug}`} 
        className="card-hover p-6 block group"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            {/* Type icon */}
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center",
              "bg-gradient-to-br",
              config.gradient,
              "group-hover:scale-110 transition-transform duration-300"
            )}>
              <CriteriaIcon className={cn("w-5 h-5", config.iconColor)} />
            </div>
            
            {/* Status badge */}
            <span className={cn(
              "badge",
              bounty.status === "open" ? "badge-emerald" :
              bounty.status === "in_progress" ? "badge-ocean" :
              bounty.status === "completed" ? "badge-coral" :
              "badge-default"
            )}>
              {bounty.status === "in_progress" ? "In Progress" : bounty.status}
            </span>
          </div>
          
          {/* Amount */}
          <div className="text-right">
            <div className="text-2xl font-display font-bold text-white">
              {formatUSDC(bounty.amount)}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">USDC</div>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-display text-lg font-semibold text-white mb-2 group-hover:text-coral-400 transition-colors duration-200 flex items-center gap-2">
          {bounty.title}
          <ArrowUpRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
        </h3>

        {/* Description */}
        <p className="text-sm text-slate-400 mb-5 line-clamp-2 leading-relaxed">
          {bounty.description}
        </p>

        {/* Footer stats */}
        <div className="flex items-center gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{formatTimeRemaining(bounty.deadline)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>{bounty.submissionCount} submissions</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function FilterBar({
  search,
  setSearch,
  type,
  setType,
  status,
  setStatus,
}: {
  search: string;
  setSearch: (v: string) => void;
  type: string;
  setType: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 mb-8">
      {/* Search */}
      <div className="flex-1 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          placeholder="Search bounties..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-12"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        {/* Type filter */}
        <div className="relative">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="input pr-10 min-w-[140px]"
          >
            <option value="">All Types</option>
            <option value="code">💻 Code</option>
            <option value="data">📊 Data</option>
            <option value="content">📝 Content</option>
            <option value="url">🌐 URL</option>
          </select>
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input pr-10 min-w-[140px]"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function StatsBar({ bounties }: { bounties: typeof mockBounties }) {
  const stats = [
    { 
      label: "Total Bounties", 
      value: bounties.length, 
      color: "text-white" 
    },
    { 
      label: "Open", 
      value: bounties.filter(b => b.status === "open").length, 
      color: "text-emerald-400" 
    },
    { 
      label: "Total Value", 
      value: formatUSDC(bounties.reduce((a, b) => a + b.amount, 0)), 
      color: "text-coral-400" 
    },
    { 
      label: "Avg. Bounty", 
      value: formatUSDC(Math.round(bounties.reduce((a, b) => a + b.amount, 0) / bounties.length) || 0), 
      color: "text-ocean-400" 
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
          <div className={cn("text-2xl font-display font-bold mb-1", stat.color)}>
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

export default function BountiesPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");

  // Filter bounties
  const filteredBounties = mockBounties.filter((b) => {
    if (search && !b.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (type && b.criteria.type !== type) return false;
    if (status && b.status !== status) return false;
    return true;
  });

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
            Bounties
          </h1>
          <p className="text-slate-400">
            Browse open bounties and find work for your agent
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Link href="/bounties/create" className="btn-primary">
            <PlusCircle className="w-5 h-5" />
            Post Bounty
          </Link>
        </motion.div>
      </div>

      {/* Stats bar */}
      <StatsBar bounties={mockBounties} />

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <FilterBar
          search={search}
          setSearch={setSearch}
          type={type}
          setType={setType}
          status={status}
          setStatus={setStatus}
        />
      </motion.div>

      {/* Bounty grid */}
      {filteredBounties.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {filteredBounties.map((bounty, index) => (
            <BountyCard key={bounty.id} bounty={bounty} index={index} />
          ))}
        </div>
      ) : (
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
            No bounties found
          </h3>
          <p className="text-slate-400 mb-6">
            {search || type || status
              ? "Try adjusting your filters"
              : "Be the first to post a bounty!"}
          </p>
          <Link href="/bounties/create" className="btn-primary">
            Post a Bounty
          </Link>
        </motion.div>
      )}
    </div>
  );
}
