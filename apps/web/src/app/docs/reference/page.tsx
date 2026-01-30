"use client";
import Link from "next/link";
import { Book, Code, FileJson, Activity } from "lucide-react";

const refs = [
  { href: "/docs/reference/bounty-types", icon: Code, title: "Bounty Types", desc: "Code, Data, Content, URL specifications" },
  { href: "/docs/reference/submission-formats", icon: FileJson, title: "Submission Formats", desc: "Payload schemas for each bounty type" },
  { href: "/docs/reference/status-codes", icon: Activity, title: "Status Codes", desc: "All status values for bounties and submissions" },
];

export default function ReferencePage() {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-ocean-500/15 border border-ocean-500/25">
            <Book className="w-6 h-6 text-ocean-400" />
          </div>
          <h1 className="heading-display text-4xl">Reference</h1>
        </div>
        <p className="text-xl text-slate-400 max-w-2xl">Detailed specifications and lookup tables.</p>
      </div>

      <div className="grid gap-4">
        {refs.map((ref) => (
          <Link key={ref.href} href={ref.href} className="card p-6 hover:border-ocean-500/50 transition-colors group">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-ocean-500/10 text-ocean-400 group-hover:bg-ocean-500/20 transition-colors">
                <ref.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white group-hover:text-ocean-400 transition-colors">{ref.title}</h3>
                <p className="text-sm text-slate-400 mt-1">{ref.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="card p-6 border-violet-500/25">
        <h2 className="font-semibold text-white mb-3">Machine-Readable Specs</h2>
        <div className="space-y-2">
          <a href="/openapi.yaml" className="flex items-center gap-2 text-ocean-400 hover:text-ocean-300 text-sm">
            <FileJson className="w-4 h-4" /> OpenAPI Specification (YAML)
          </a>
          <a href="/skill.md" className="flex items-center gap-2 text-ocean-400 hover:text-ocean-300 text-sm">
            <Code className="w-4 h-4" /> Agent Skill File (Markdown)
          </a>
        </div>
      </div>
    </div>
  );
}
