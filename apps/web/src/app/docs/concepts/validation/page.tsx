"use client";

import Link from "next/link";
import { useState } from "react";
import { Copy, Check, CheckCircle, Code, Database, FileText, Globe, ArrowRight, AlertCircle, Shield } from "lucide-react";

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <pre className="bg-slate-800/50 rounded-xl p-4 overflow-x-auto text-sm border border-slate-700/50">
        <code className="text-slate-300 font-mono">{code}</code>
      </pre>
      <button onClick={handleCopy} className="absolute top-3 right-3 p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100">
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function ValidationConceptPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/25">
            <CheckCircle className="w-6 h-6 text-amber-400" />
          </div>
          <h1 className="heading-display text-4xl">Validation</h1>
        </div>
        <p className="text-xl text-slate-400 max-w-2xl">
          Submissions are automatically validated against the bounty's criteria. 
          No human review - validation is objective, consistent, and instant.
        </p>
      </div>

      {/* How It Works */}
      <section id="how-it-works" className="space-y-6">
        <h2 className="text-2xl font-semibold text-white">How Validation Works</h2>
        <div className="card p-6">
          <ol className="space-y-4">
            <li className="flex items-start gap-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-ocean-500/20 text-ocean-400 font-bold text-sm flex-shrink-0">1</span>
              <div>
                <p className="font-medium text-white">Submission Received</p>
                <p className="text-sm text-slate-400">Payload is verified (signature, size, format) and queued</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-500/20 text-violet-400 font-bold text-sm flex-shrink-0">2</span>
              <div>
                <p className="font-medium text-white">Criteria Loaded</p>
                <p className="text-sm text-slate-400">Bounty's validation criteria are fetched and parsed</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-bold text-sm flex-shrink-0">3</span>
              <div>
                <p className="font-medium text-white">Validation Executed</p>
                <p className="text-sm text-slate-400">Type-specific validator runs checks against criteria</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-sm flex-shrink-0">4</span>
              <div>
                <p className="font-medium text-white">Result Recorded</p>
                <p className="text-sm text-slate-400">Pass or fail with detailed reasoning stored on submission</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* Code Validation */}
      <section id="code-validation" className="space-y-6">
        <div className="flex items-center gap-3">
          <Code className="w-6 h-6 text-ocean-400" />
          <h2 className="text-2xl font-semibold text-white">Code Validation</h2>
        </div>
        <p className="text-slate-400">
          Code submissions are executed in isolated sandboxes with controlled resources.
        </p>
        <div className="card p-4">
          <h3 className="font-medium text-white mb-3">Validation Process</h3>
          <ol className="space-y-2 text-sm text-slate-400">
            <li>1. Files extracted and written to sandbox</li>
            <li>2. Setup command executed (if specified)</li>
            <li>3. Test command executed</li>
            <li>4. Exit code and output compared to expected</li>
            <li>5. Resource limits enforced throughout</li>
          </ol>
        </div>
        <CodeBlock code={`// Example code criteria
{
  "type": "code",
  "language": "python",
  "requiredFiles": ["main.py"],
  "entryPoint": "main.py",
  "setupCommand": "pip install -r requirements.txt",
  "testCommand": "python main.py --test",
  "expectedExitCode": 0,
  "maxExecutionSeconds": 60,
  "maxMemoryMB": 512,
  "allowNetwork": false,
  "testCases": [
    { "input": "hello", "expectedOutput": "HELLO" },
    { "input": "world", "expectedOutput": "WORLD" }
  ]
}`} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-4 border-emerald-500/25">
            <h3 className="font-medium text-emerald-400 mb-2">Passes When</h3>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• All required files present</li>
              <li>• Exit code matches expected</li>
              <li>• All test cases pass</li>
              <li>• Within time/memory limits</li>
            </ul>
          </div>
          <div className="card p-4 border-coral-500/25">
            <h3 className="font-medium text-coral-400 mb-2">Fails When</h3>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Missing required files</li>
              <li>• Runtime error or crash</li>
              <li>• Test case output mismatch</li>
              <li>• Timeout or memory exceeded</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Data Validation */}
      <section id="data-validation" className="space-y-6">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-coral-400" />
          <h2 className="text-2xl font-semibold text-white">Data Validation</h2>
        </div>
        <p className="text-slate-400">
          Data submissions are validated against schema, constraints, and quality rules.
        </p>
        <CodeBlock code={`// Example data criteria
{
  "type": "data",
  "format": "json",
  "minRows": 1000,
  "maxRows": 10000,
  "requiredColumns": ["product_name", "price", "url"],
  "columnTypes": {
    "product_name": "string",
    "price": "number",
    "url": "url"
  },
  "constraints": {
    "price": { "min": 0, "notNull": true },
    "url": { "pattern": "^https://", "notNull": true },
    "product_name": { "minLength": 3, "maxLength": 200 }
  },
  "uniqueOn": ["url"],
  "maxNullPercent": 5,
  "maxDuplicatePercent": 1
}`} />
        <div className="card p-4">
          <h3 className="font-medium text-white mb-3">Validation Checks</h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-800/50">
              <tr>
                <td className="py-2 pr-4 text-slate-400">Format</td>
                <td className="py-2">Valid JSON/CSV/JSONL structure</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-slate-400">Row Count</td>
                <td className="py-2">Within min/max range</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-slate-400">Schema</td>
                <td className="py-2">Required columns present, correct types</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-slate-400">Constraints</td>
                <td className="py-2">Values match patterns, ranges, enums</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-slate-400">Uniqueness</td>
                <td className="py-2">No duplicates on specified columns</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-slate-400">Quality</td>
                <td className="py-2">Null percentage, duplicate percentage</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Content Validation */}
      <section id="content-validation" className="space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-violet-400" />
          <h2 className="text-2xl font-semibold text-white">Content Validation</h2>
        </div>
        <p className="text-slate-400">
          Content submissions are validated for length, structure, keywords, and optionally plagiarism.
        </p>
        <CodeBlock code={`// Example content criteria
{
  "type": "content",
  "format": "markdown",
  "minWords": 1500,
  "maxWords": 3000,
  "requiredSections": ["Introduction", "Main Body", "Conclusion"],
  "mustContain": ["AI", "machine learning", "neural network"],
  "mustNotContain": ["lorem ipsum", "placeholder"],
  "minReadabilityScore": 60,
  "plagiarismCheck": true,
  "maxSimilarityPercent": 15
}`} />
        <div className="card p-4">
          <h3 className="font-medium text-white mb-3">Validation Checks</h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-800/50">
              <tr>
                <td className="py-2 pr-4 text-slate-400">Word Count</td>
                <td className="py-2">Within min/max range</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-slate-400">Sections</td>
                <td className="py-2">Required headings/sections present</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-slate-400">Keywords</td>
                <td className="py-2">Must contain / must not contain</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-slate-400">Readability</td>
                <td className="py-2">Flesch-Kincaid score threshold</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-slate-400">Originality</td>
                <td className="py-2">Plagiarism/similarity check (optional)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* URL Validation */}
      <section id="url-validation" className="space-y-6">
        <div className="flex items-center gap-3">
          <Globe className="w-6 h-6 text-emerald-400" />
          <h2 className="text-2xl font-semibold text-white">URL Validation</h2>
        </div>
        <p className="text-slate-400">
          URL submissions are validated by making actual HTTP requests to the specified endpoints.
        </p>
        <CodeBlock code={`// Example URL criteria
{
  "type": "url",
  "mustBeHttps": true,
  "endpoints": [
    {
      "path": "/health",
      "method": "GET",
      "expectedStatus": 200,
      "maxResponseMs": 500
    },
    {
      "path": "/api/search",
      "method": "POST",
      "headers": { "Content-Type": "application/json" },
      "body": { "query": "test" },
      "expectedStatus": 200,
      "bodyContains": "results",
      "maxResponseMs": 2000
    }
  ],
  "minUptimePercent": 99,
  "checkCount": 3
}`} />
        <div className="card p-4">
          <h3 className="font-medium text-white mb-3">Validation Checks</h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-800/50">
              <tr>
                <td className="py-2 pr-4 text-slate-400">Protocol</td>
                <td className="py-2">HTTPS required (if specified)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-slate-400">Endpoints</td>
                <td className="py-2">Each endpoint returns expected status</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-slate-400">Response</td>
                <td className="py-2">Body contains required content</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-slate-400">Performance</td>
                <td className="py-2">Response time within limits</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-slate-400">Uptime</td>
                <td className="py-2">Multiple checks (if specified)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Validation Results */}
      <section id="results" className="space-y-6">
        <h2 className="text-2xl font-semibold text-white">Validation Results</h2>
        <p className="text-slate-400">
          Every validation produces a detailed result object:
        </p>
        <CodeBlock code={`// Validation result structure
{
  "passed": false,
  "reason": "Data validation failed: 3 constraint violations",
  "details": {
    "format": "json",
    "rowCount": 1250,
    "schemaErrors": [],
    "constraintViolations": [
      "Row 42: price is negative (-5.99)",
      "Row 156: url does not match pattern ^https://",
      "Row 892: product_name exceeds maxLength (245 > 200)"
    ],
    "uniqueViolations": 0,
    "nullPercentages": {
      "product_name": 0.1,
      "price": 0,
      "url": 0
    },
    "duplicatePercentage": 0.5
  },
  "executionTimeMs": 1234
}`} />
      </section>

      {/* Security */}
      <section id="security" className="space-y-6">
        <h2 className="text-2xl font-semibold text-white">Security & Sandboxing</h2>
        <div className="card p-6 border-amber-500/25 bg-amber-500/5">
          <div className="flex items-start gap-4">
            <Shield className="w-6 h-6 text-amber-400 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-400 mb-2">Isolated Execution</h3>
              <p className="text-slate-400">
                Code submissions run in isolated containers with no access to the host system, 
                other submissions, or external networks (unless allowed by criteria).
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-4">
            <h3 className="font-medium text-white mb-2">Resource Limits</h3>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Max execution time: 300 seconds</li>
              <li>• Max memory: 2048 MB</li>
              <li>• Max payload size: 10 MB</li>
              <li>• Network: disabled by default</li>
            </ul>
          </div>
          <div className="card p-4">
            <h3 className="font-medium text-white mb-2">Content Scanning</h3>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Private keys detection</li>
              <li>• Seed phrases detection</li>
              <li>• Malicious pattern blocking</li>
              <li>• Size limit enforcement</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Related Topics */}
      <section className="card p-8 bg-gradient-to-br from-amber-950/50 to-slate-900/50 border-amber-500/20">
        <h2 className="text-xl font-semibold text-white mb-4">Related Topics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/docs/reference/bounty-types" className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors">
            <ArrowRight className="w-4 h-4" />
            <span>Bounty types reference</span>
          </Link>
          <Link href="/docs/reference/submission-formats" className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors">
            <ArrowRight className="w-4 h-4" />
            <span>Submission formats</span>
          </Link>
          <Link href="/docs/concepts/submissions" className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors">
            <ArrowRight className="w-4 h-4" />
            <span>Understanding submissions</span>
          </Link>
          <Link href="/docs/guides/winning-bounties" className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors">
            <ArrowRight className="w-4 h-4" />
            <span>Tips for passing validation</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
