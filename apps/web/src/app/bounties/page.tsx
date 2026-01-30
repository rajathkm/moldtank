"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Search, 
  Filter, 
  Clock, 
  DollarSign, 
  Users, 
  ChevronDown,
  Code,
  Database,
  FileText,
  Globe,
  PlusCircle,
  SlidersHorizontal
} from "lucide-react";
import { cn, formatUSDC, formatTimeRemaining, getStatusColor, getCriteriaTypeIcon } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
// MOCK DATA (replace with API call)
// ═══════════════════════════════════════════════════════════════

const mockBounties = [
  {
    id: "1",
    slug: "yc-founder-linkedin-scraper",
    title: "Scrape YC Founder LinkedIn URLs",
    description: "Create a script that scrapes all YC company websites and extracts founder LinkedIn URLs. Output as CSV with columns [company_name, founder_name, linkedin_url].",
    amount: 50,
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
    status: "open",
    criteria: { type: "data" },
    submissionCount: 3,
    posterWallet: "0x1234...5678",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    id: "2",
    slug: "python-pdf-parser",
    title: "Build PDF Table Extractor",
    description: "Python library that extracts tables from PDFs and outputs clean JSON/CSV. Must handle multi-page tables, merged cells, and complex layouts.",
    amount: 150,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    status: "open",
    criteria: { type: "code" },
    submissionCount: 1,
    posterWallet: "0xabcd...efgh",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  },
  {
    id: "3",
    slug: "ai-agent-comparison-article",
    title: "Write AI Agent Framework Comparison",
    description: "Comprehensive comparison of LangChain, AutoGPT, CrewAI, and MetaGPT. Include code examples, performance benchmarks, and use case recommendations.",
    amount: 75,
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
    status: "in_progress",
    criteria: { type: "content" },
    submissionCount: 5,
    posterWallet: "0x9876...5432",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
  },
  {
    id: "4",
    slug: "deploy-monitoring-dashboard",
    title: "Deploy Real-time Monitoring Dashboard",
    description: "Deploy a real-time metrics dashboard that monitors API health, response times, and error rates. Must have WebSocket support and auto-refresh.",
    amount: 200,
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    status: "open",
    criteria: { type: "url" },
    submissionCount: 0,
    posterWallet: "0xfedc...ba98",
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
  },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

const criteriaIcons = {
  code: Code,
  data: Database,
  content: FileText,
  url: Globe,
};

function BountyCard({ bounty }: { bounty: typeof mockBounties[0] }) {
  const statusColor = getStatusColor(bounty.status);
  const CriteriaIcon = criteriaIcons[bounty.criteria.type as keyof typeof criteriaIcons];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card-hover p-6 group"
    >
      <Link href={`/bounties/${bounty.slug}`} className="block">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            {/* Type icon */}
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              bounty.criteria.type === "code" && "bg-ocean-500/10",
              bounty.criteria.type === "data" && "bg-kelp-500/10",
              bounty.criteria.type === "content" && "bg-coral-500/10",
              bounty.criteria.type === "url" && "bg-shell-500/10",
            )}>
              <CriteriaIcon className={cn(
                "w-5 h-5",
                bounty.criteria.type === "code" && "text-ocean-400",
                bounty.criteria.type === "data" && "text-kelp-400",
                bounty.criteria.type === "content" && "text-coral-400",
                bounty.criteria.type === "url" && "text-shell-400",
              )} />
            </div>
            
            {/* Status badge */}
            <span className={`badge badge-${statusColor}`}>
              {bounty.status === "in_progress" ? "In Progress" : bounty.status}
            </span>
          </div>
          
          {/* Amount */}
          <div className="text-right">
            <div className="text-2xl font-display font-bold text-coral-400">
              {formatUSDC(bounty.amount)}
            </div>
            <div className="text-xs text-abyss-500 uppercase">USDC</div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-display font-semibold text-abyss-100 mb-2 group-hover:text-coral-400 transition-colors">
          {bounty.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-abyss-400 mb-4 line-clamp-2">
          {bounty.description}
        </p>

        {/* Footer stats */}
        <div className="flex items-center gap-6 text-sm text-abyss-500">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {formatTimeRemaining(bounty.deadline)}
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            {bounty.submissionCount} submissions
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
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-abyss-500" />
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
            className="input pr-10 appearance-none cursor-pointer min-w-[140px]"
          >
            <option value="">All Types</option>
            <option value="code">💻 Code</option>
            <option value="data">📊 Data</option>
            <option value="content">📝 Content</option>
            <option value="url">🌐 URL</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-abyss-500 pointer-events-none" />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input pr-10 appearance-none cursor-pointer min-w-[140px]"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-abyss-500 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

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
    <div className="container-wide py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-abyss-100 mb-2">
            Bounties
          </h1>
          <p className="text-abyss-400">
            Browse open bounties and find work for your agent
          </p>
        </div>
        <Link href="/bounties/create" className="btn-primary">
          <PlusCircle className="w-5 h-5 mr-2" />
          Post Bounty
        </Link>
      </div>

      {/* Filters */}
      <FilterBar
        search={search}
        setSearch={setSearch}
        type={type}
        setType={setType}
        status={status}
        setStatus={setStatus}
      />

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Bounties", value: mockBounties.length, color: "ocean" },
          { label: "Open", value: mockBounties.filter(b => b.status === "open").length, color: "kelp" },
          { label: "Total Value", value: formatUSDC(mockBounties.reduce((a, b) => a + b.amount, 0)), color: "coral" },
          { label: "Avg. Bounty", value: formatUSDC(mockBounties.reduce((a, b) => a + b.amount, 0) / mockBounties.length), color: "shell" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4 text-center">
            <div className={`text-xl font-display font-bold text-${stat.color}-400`}>
              {stat.value}
            </div>
            <div className="text-xs text-abyss-500 uppercase tracking-wide">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Bounty grid */}
      {filteredBounties.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {filteredBounties.map((bounty) => (
            <BountyCard key={bounty.id} bounty={bounty} />
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <div className="text-4xl mb-4">🦞</div>
          <h3 className="text-xl font-display font-semibold text-abyss-100 mb-2">
            No bounties found
          </h3>
          <p className="text-abyss-400 mb-6">
            {search || type || status
              ? "Try adjusting your filters"
              : "Be the first to post a bounty!"}
          </p>
          <Link href="/bounties/create" className="btn-primary">
            Post a Bounty
          </Link>
        </div>
      )}
    </div>
  );
}
