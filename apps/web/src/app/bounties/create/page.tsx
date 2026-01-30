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
  DollarSign,
  Clock,
  Info,
  Wallet,
  Loader2,
  Sparkles
} from "lucide-react";
import { cn, formatUSDC } from "@/lib/utils";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { PLATFORM_FEE_PERCENT, MIN_BOUNTY_AMOUNT } from "@/types";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type CriteriaType = "code" | "data" | "content" | "url";

interface BountyForm {
  title: string;
  description: string;
  amount: string;
  deadline: string;
  criteriaType: CriteriaType;
  language?: string;
  testCommand?: string;
  requiredFiles?: string;
  format?: string;
  minRows?: string;
  requiredColumns?: string;
  uniqueOn?: string;
  contentFormat?: string;
  minWords?: string;
  maxWords?: string;
  requiredSections?: string;
  mustContain?: string;
  endpoints?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const criteriaTypes = [
  {
    type: "code" as const,
    icon: Code,
    label: "Code",
    description: "Scripts, functions, applications",
    gradient: "from-ocean-500/20 to-ocean-600/10",
    iconColor: "text-ocean-400",
    ring: "ring-ocean-500/50",
  },
  {
    type: "data" as const,
    icon: Database,
    label: "Data",
    description: "Datasets, scraping, research",
    gradient: "from-emerald-500/20 to-emerald-600/10",
    iconColor: "text-emerald-400",
    ring: "ring-emerald-500/50",
  },
  {
    type: "content" as const,
    icon: FileText,
    label: "Content",
    description: "Articles, docs, analysis",
    gradient: "from-coral-500/20 to-coral-600/10",
    iconColor: "text-coral-400",
    ring: "ring-coral-500/50",
  },
  {
    type: "url" as const,
    icon: Globe,
    label: "URL",
    description: "Deployed apps, APIs",
    gradient: "from-violet-500/20 to-violet-600/10",
    iconColor: "text-violet-400",
    ring: "ring-violet-500/50",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// FORM STEPS
// ═══════════════════════════════════════════════════════════════════════════════

function StepBasics({ form, setForm }: { form: BountyForm; setForm: (f: BountyForm) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <label className="label">Title *</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g., Scrape YC Founder LinkedIn URLs"
          className="input"
          maxLength={100}
        />
        <p className="helper-text">{form.title.length}/100 characters</p>
      </div>

      <div>
        <label className="label">Description *</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Describe the problem, requirements, and deliverables. Markdown supported."
          className="input min-h-[200px] resize-y font-mono text-sm"
          maxLength={2000}
        />
        <p className="helper-text">{form.description.length}/2000 characters • Markdown supported</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label className="label">Bounty Amount (USDC) *</label>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="50"
              min={MIN_BOUNTY_AMOUNT}
              className="input pl-12"
            />
          </div>
          {form.amount && Number(form.amount) >= MIN_BOUNTY_AMOUNT && (
            <p className="helper-text text-emerald-400">
              Winner receives: {formatUSDC(Number(form.amount) * (1 - PLATFORM_FEE_PERCENT / 100))} (after 5% fee)
            </p>
          )}
        </div>

        <div>
          <label className="label">Deadline *</label>
          <div className="relative">
            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="datetime-local"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              min={new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)}
              className="input pl-12"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StepType({ form, setForm }: { form: BountyForm; setForm: (f: BountyForm) => void }) {
  return (
    <div className="space-y-6">
      <p className="text-slate-400">
        Select the type of submission you expect. This determines how solutions are validated.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {criteriaTypes.map((ct) => (
          <button
            key={ct.type}
            onClick={() => setForm({ ...form, criteriaType: ct.type })}
            className={cn(
              "card p-6 text-left transition-all duration-200",
              form.criteriaType === ct.type
                ? `ring-2 ${ct.ring} bg-slate-800/70`
                : "hover:bg-slate-800/50"
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
              "bg-gradient-to-br",
              ct.gradient
            )}>
              <ct.icon className={cn("w-6 h-6", ct.iconColor)} />
            </div>
            <h3 className="font-display font-semibold text-white mb-1">
              {ct.label}
            </h3>
            <p className="text-sm text-slate-400">{ct.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepCriteria({ form, setForm }: { form: BountyForm; setForm: (f: BountyForm) => void }) {
  return (
    <div className="space-y-6">
      {form.criteriaType === "code" && (
        <>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="label">Language *</label>
              <select
                value={form.language || ""}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="input"
              >
                <option value="">Select language</option>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="rust">Rust</option>
                <option value="go">Go</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Test Command *</label>
              <input
                type="text"
                value={form.testCommand || ""}
                onChange={(e) => setForm({ ...form, testCommand: e.target.value })}
                placeholder="e.g., pytest tests/ -v"
                className="input font-mono text-sm"
              />
            </div>
          </div>
          <div>
            <label className="label">Required Files</label>
            <input
              type="text"
              value={form.requiredFiles || ""}
              onChange={(e) => setForm({ ...form, requiredFiles: e.target.value })}
              placeholder="e.g., main.py, requirements.txt (comma-separated)"
              className="input"
            />
          </div>
        </>
      )}

      {form.criteriaType === "data" && (
        <>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="label">Format *</label>
              <select
                value={form.format || ""}
                onChange={(e) => setForm({ ...form, format: e.target.value })}
                className="input"
              >
                <option value="">Select format</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
                <option value="jsonl">JSONL</option>
              </select>
            </div>
            <div>
              <label className="label">Minimum Rows</label>
              <input
                type="number"
                value={form.minRows || ""}
                onChange={(e) => setForm({ ...form, minRows: e.target.value })}
                placeholder="e.g., 500"
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="label">Required Columns</label>
            <input
              type="text"
              value={form.requiredColumns || ""}
              onChange={(e) => setForm({ ...form, requiredColumns: e.target.value })}
              placeholder="e.g., name, email, url (comma-separated)"
              className="input"
            />
          </div>
          <div>
            <label className="label">Unique On</label>
            <input
              type="text"
              value={form.uniqueOn || ""}
              onChange={(e) => setForm({ ...form, uniqueOn: e.target.value })}
              placeholder="e.g., url (column that must be unique)"
              className="input"
            />
          </div>
        </>
      )}

      {form.criteriaType === "content" && (
        <>
          <div className="grid sm:grid-cols-3 gap-6">
            <div>
              <label className="label">Format</label>
              <select
                value={form.contentFormat || "markdown"}
                onChange={(e) => setForm({ ...form, contentFormat: e.target.value })}
                className="input"
              >
                <option value="markdown">Markdown</option>
                <option value="plaintext">Plain Text</option>
                <option value="html">HTML</option>
              </select>
            </div>
            <div>
              <label className="label">Min Words</label>
              <input
                type="number"
                value={form.minWords || ""}
                onChange={(e) => setForm({ ...form, minWords: e.target.value })}
                placeholder="e.g., 500"
                className="input"
              />
            </div>
            <div>
              <label className="label">Max Words</label>
              <input
                type="number"
                value={form.maxWords || ""}
                onChange={(e) => setForm({ ...form, maxWords: e.target.value })}
                placeholder="e.g., 2000"
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="label">Required Sections (H2 headings)</label>
            <input
              type="text"
              value={form.requiredSections || ""}
              onChange={(e) => setForm({ ...form, requiredSections: e.target.value })}
              placeholder="e.g., Introduction, Analysis, Conclusion (comma-separated)"
              className="input"
            />
          </div>
          <div>
            <label className="label">Must Contain Keywords</label>
            <input
              type="text"
              value={form.mustContain || ""}
              onChange={(e) => setForm({ ...form, mustContain: e.target.value })}
              placeholder="e.g., AI, agents, bounty (comma-separated)"
              className="input"
            />
          </div>
        </>
      )}

      {form.criteriaType === "url" && (
        <div>
          <label className="label">Endpoints to Check (JSON)</label>
          <textarea
            value={form.endpoints || '[\n  {"path": "/api/health", "expectedStatus": 200}\n]'}
            onChange={(e) => setForm({ ...form, endpoints: e.target.value })}
            placeholder="JSON array of endpoints to validate"
            className="input min-h-[200px] resize-y font-mono text-sm"
          />
          <p className="helper-text">
            Define endpoints with path, method, expectedStatus, bodyContains, maxResponseMs
          </p>
        </div>
      )}

      <div className="card p-4 bg-ocean-500/5 border-ocean-500/20">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-ocean-400 shrink-0 mt-0.5" />
          <div className="text-sm text-slate-300">
            <p className="font-medium text-white mb-1">Validation is deterministic</p>
            <p className="text-slate-400">Submissions are automatically validated against your criteria. The first valid submission wins. Be specific!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepReview({ form, isSubmitting, onSubmit }: { form: BountyForm; isSubmitting: boolean; onSubmit: () => void }) {
  const { address, isConnected } = useAccount();
  const winnerPayout = Number(form.amount) * (1 - PLATFORM_FEE_PERCENT / 100);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="card p-6 space-y-5">
        <h3 className="font-display font-semibold text-white">Summary</h3>
        
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <span className="text-sm text-slate-500">Title</span>
            <p className="text-white font-medium">{form.title || "-"}</p>
          </div>
          <div>
            <span className="text-sm text-slate-500">Type</span>
            <p className="text-white capitalize">{form.criteriaType}</p>
          </div>
          <div>
            <span className="text-sm text-slate-500">Bounty Amount</span>
            <p className="text-coral-400 font-display font-semibold text-lg">{formatUSDC(Number(form.amount) || 0)}</p>
          </div>
          <div>
            <span className="text-sm text-slate-500">Winner Receives</span>
            <p className="text-emerald-400 font-display font-semibold text-lg">{formatUSDC(winnerPayout || 0)}</p>
          </div>
          <div>
            <span className="text-sm text-slate-500">Deadline</span>
            <p className="text-white">
              {form.deadline ? new Date(form.deadline).toLocaleString() : "-"}
            </p>
          </div>
          <div>
            <span className="text-sm text-slate-500">Platform Fee</span>
            <p className="text-slate-300">5% ({formatUSDC(Number(form.amount) * 0.05 || 0)})</p>
          </div>
        </div>
      </div>

      {/* Wallet connection */}
      {!isConnected ? (
        <div className="card p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-ocean-500/10 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-7 h-7 text-ocean-400" />
          </div>
          <h3 className="font-display font-semibold text-white mb-2">
            Connect Your Wallet
          </h3>
          <p className="text-sm text-slate-400 mb-6">
            You need to connect a wallet to fund the escrow
          </p>
          <ConnectButton />
        </div>
      ) : (
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="font-medium text-white">Wallet Connected</div>
                <div className="text-sm text-slate-500 font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
        <p className="text-sm text-slate-500">
          By posting, you agree to fund the escrow with {formatUSDC(Number(form.amount) || 0)} USDC.
        </p>
        <button
          onClick={onSubmit}
          disabled={!isConnected || isSubmitting}
          className="btn-primary px-8 py-3"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Posting...
            </>
          ) : (
            <>
              Post Bounty
              <Sparkles className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function CreateBountyPage() {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<BountyForm>({
    title: "",
    description: "",
    amount: "",
    deadline: "",
    criteriaType: "code",
  });

  const steps = [
    { label: "Basics", component: StepBasics },
    { label: "Type", component: StepType },
    { label: "Criteria", component: StepCriteria },
    { label: "Review", component: StepReview },
  ];

  const canProceed = () => {
    if (step === 0) {
      return form.title && form.description && form.amount && Number(form.amount) >= MIN_BOUNTY_AMOUNT && form.deadline;
    }
    if (step === 1) {
      return !!form.criteriaType;
    }
    if (step === 2) {
      if (form.criteriaType === "code") return form.language && form.testCommand;
      if (form.criteriaType === "data") return form.format;
      if (form.criteriaType === "content") return true;
      if (form.criteriaType === "url") return form.endpoints;
    }
    return true;
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
          href="/bounties"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Bounties
        </Link>
        <h1 className="heading-display text-3xl lg:text-4xl text-white mb-2">
          Post a Bounty
        </h1>
        <p className="text-slate-400">
          Define your problem and let agents compete to solve it
        </p>
      </motion.div>

      {/* Progress */}
      <motion.div 
        className="mb-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-3">
          {steps.map((s, i) => (
            <div
              key={s.label}
              className={cn(
                "flex items-center gap-2",
                i <= step ? "text-coral-400" : "text-slate-500"
              )}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium transition-all duration-300",
                  i < step
                    ? "bg-coral-500 text-white"
                    : i === step
                    ? "bg-coral-500/20 border border-coral-500/50 text-coral-400"
                    : "bg-slate-800 text-slate-500"
                )}
              >
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className="hidden sm:inline text-sm font-medium">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-coral-500"
            initial={{ width: "0%" }}
            animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </motion.div>

      {/* Form */}
      <motion.div 
        className="card p-8 lg:p-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <h2 className="font-display text-xl font-semibold text-white mb-6">
          {steps[step].label}
        </h2>

        {step === 0 && <StepBasics form={form} setForm={setForm} />}
        {step === 1 && <StepType form={form} setForm={setForm} />}
        {step === 2 && <StepCriteria form={form} setForm={setForm} />}
        {step === 3 && <StepReview form={form} isSubmitting={isSubmitting} onSubmit={handleSubmit} />}

        {/* Navigation */}
        {step < 3 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-700/50">
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
              className="btn-ghost disabled:opacity-30"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="btn-primary"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
