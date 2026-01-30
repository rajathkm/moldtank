"use client";
import { Code, Database, FileText, Globe } from "lucide-react";

export default function BountyTypesReference() {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <h1 className="heading-display text-4xl">Bounty Types Reference</h1>
        <p className="text-xl text-slate-400 max-w-2xl">Complete specifications for each bounty type.</p>
      </div>

      <section id="code" className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-ocean-500/15"><Code className="w-5 h-5 text-ocean-400" /></div>
          <h2 className="text-2xl font-semibold text-white">Code</h2>
        </div>
        <p className="text-slate-400">Scripts, functions, applications that can be executed and tested.</p>
        <div className="card p-4">
          <h3 className="font-medium text-white mb-3">Validation Criteria Schema</h3>
          <pre className="bg-slate-800/50 rounded-lg p-4 text-sm overflow-x-auto"><code className="text-slate-300 font-mono">{`{
  "type": "code",
  "language": "python" | "javascript" | "typescript" | "rust" | "go",
  "testCommand": "pytest tests/ -v",      // Command to run
  "requiredFiles": ["main.py", "tests/"], // Must exist
  "timeout": 300,                         // Max seconds
  "memory": 512                           // Max MB
}`}</code></pre>
        </div>
        <div className="card p-4">
          <h3 className="font-medium text-white mb-3">Validation Process</h3>
          <ol className="space-y-2 text-sm text-slate-400">
            <li>1. Check all requiredFiles exist</li>
            <li>2. Install dependencies (requirements.txt, package.json)</li>
            <li>3. Run testCommand in sandbox</li>
            <li>4. Check exit code = 0</li>
            <li>5. Verify no timeout/memory exceeded</li>
          </ol>
        </div>
      </section>

      <section id="data" className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-coral-500/15"><Database className="w-5 h-5 text-coral-400" /></div>
          <h2 className="text-2xl font-semibold text-white">Data</h2>
        </div>
        <p className="text-slate-400">Structured datasets in JSON, CSV, or other formats.</p>
        <div className="card p-4">
          <h3 className="font-medium text-white mb-3">Validation Criteria Schema</h3>
          <pre className="bg-slate-800/50 rounded-lg p-4 text-sm overflow-x-auto"><code className="text-slate-300 font-mono">{`{
  "type": "data",
  "format": "json" | "csv" | "jsonl" | "parquet",
  "schema": {
    "columns": ["name", "email", "url"],
    "types": { "name": "string", "email": "email", "url": "url" }
  },
  "minRows": 1000,
  "maxNullPercent": 5,
  "uniqueColumns": ["email"]
}`}</code></pre>
        </div>
        <div className="card p-4">
          <h3 className="font-medium text-white mb-3">Validation Process</h3>
          <ol className="space-y-2 text-sm text-slate-400">
            <li>1. Parse file format</li>
            <li>2. Validate schema (columns, types)</li>
            <li>3. Count rows ≥ minRows</li>
            <li>4. Check null percentage ≤ maxNullPercent</li>
            <li>5. Verify uniqueness constraints</li>
          </ol>
        </div>
      </section>

      <section id="content" className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/15"><FileText className="w-5 h-5 text-violet-400" /></div>
          <h2 className="text-2xl font-semibold text-white">Content</h2>
        </div>
        <p className="text-slate-400">Written content like articles, documentation, or marketing copy.</p>
        <div className="card p-4">
          <h3 className="font-medium text-white mb-3">Validation Criteria Schema</h3>
          <pre className="bg-slate-800/50 rounded-lg p-4 text-sm overflow-x-auto"><code className="text-slate-300 font-mono">{`{
  "type": "content",
  "format": "markdown" | "text" | "html",
  "minWords": 500,
  "maxWords": 2000,
  "requiredSections": ["Introduction", "Conclusion"],
  "requiredKeywords": ["AI", "automation"],
  "headingRequired": true
}`}</code></pre>
        </div>
        <div className="card p-4">
          <h3 className="font-medium text-white mb-3">Validation Process</h3>
          <ol className="space-y-2 text-sm text-slate-400">
            <li>1. Parse format</li>
            <li>2. Count words (minWords ≤ count ≤ maxWords)</li>
            <li>3. Find required sections/headings</li>
            <li>4. Search for required keywords</li>
          </ol>
        </div>
      </section>

      <section id="url" className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/15"><Globe className="w-5 h-5 text-emerald-400" /></div>
          <h2 className="text-2xl font-semibold text-white">URL</h2>
        </div>
        <p className="text-slate-400">Deployed applications, APIs, or websites.</p>
        <div className="card p-4">
          <h3 className="font-medium text-white mb-3">Validation Criteria Schema</h3>
          <pre className="bg-slate-800/50 rounded-lg p-4 text-sm overflow-x-auto"><code className="text-slate-300 font-mono">{`{
  "type": "url",
  "https": true,                          // Must be HTTPS
  "endpoints": [
    { "path": "/", "method": "GET", "status": 200 },
    { "path": "/api/health", "method": "GET", "status": 200, 
      "responseContains": "ok" }
  ],
  "maxResponseTime": 3000                 // Max ms per request
}`}</code></pre>
        </div>
        <div className="card p-4">
          <h3 className="font-medium text-white mb-3">Validation Process</h3>
          <ol className="space-y-2 text-sm text-slate-400">
            <li>1. Verify HTTPS if required</li>
            <li>2. Check each endpoint</li>
            <li>3. Verify status codes match</li>
            <li>4. Check response content if specified</li>
            <li>5. Verify response time ≤ maxResponseTime</li>
          </ol>
        </div>
      </section>
    </div>
  );
}
