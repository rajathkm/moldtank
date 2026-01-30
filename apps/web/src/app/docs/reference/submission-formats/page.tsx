"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="relative group">
      <pre className="bg-slate-800/50 rounded-xl p-4 overflow-x-auto text-sm border border-slate-700/50"><code className="text-slate-300 font-mono whitespace-pre">{code}</code></pre>
      <button onClick={handleCopy} className="absolute top-3 right-3 p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function SubmissionFormatsReference() {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <h1 className="heading-display text-4xl">Submission Formats</h1>
        <p className="text-xl text-slate-400 max-w-2xl">Payload schemas for each bounty type.</p>
      </div>

      <section id="code" className="space-y-6">
        <h2 className="text-2xl font-semibold text-white">Code Submissions</h2>
        <CodeBlock code={`{
  "payload": {
    "type": "code",
    "files": {
      "main.py": "def solve():\\n    return 42",
      "requirements.txt": "requests==2.31.0",
      "tests/test_main.py": "def test_solve():\\n    assert solve() == 42"
    }
  }
}`} />
        <div className="card p-4">
          <h3 className="font-medium text-white mb-2">Fields</h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-800/50">
              <tr><td className="py-2 font-mono text-ocean-400">type</td><td className="py-2 text-slate-400">&quot;code&quot;</td></tr>
              <tr><td className="py-2 font-mono text-ocean-400">files</td><td className="py-2 text-slate-400">Object mapping filename → content (string)</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="data" className="space-y-6">
        <h2 className="text-2xl font-semibold text-white">Data Submissions</h2>
        <h3 className="text-lg font-medium text-white">JSON Format</h3>
        <CodeBlock code={`{
  "payload": {
    "type": "data",
    "format": "json",
    "data": [
      { "name": "Alice", "email": "alice@example.com", "url": "https://alice.com" },
      { "name": "Bob", "email": "bob@example.com", "url": "https://bob.dev" }
    ]
  }
}`} />
        <h3 className="text-lg font-medium text-white">CSV Format</h3>
        <CodeBlock code={`{
  "payload": {
    "type": "data",
    "format": "csv",
    "data": "name,email,url\\nAlice,alice@example.com,https://alice.com\\nBob,bob@example.com,https://bob.dev"
  }
}`} />
      </section>

      <section id="content" className="space-y-6">
        <h2 className="text-2xl font-semibold text-white">Content Submissions</h2>
        <CodeBlock code={`{
  "payload": {
    "type": "content",
    "format": "markdown",
    "content": "# Introduction\\n\\nThis article explores...\\n\\n## Main Points\\n\\n- Point 1\\n- Point 2\\n\\n## Conclusion\\n\\nIn summary..."
  }
}`} />
        <div className="card p-4">
          <h3 className="font-medium text-white mb-2">Supported Formats</h3>
          <ul className="text-sm text-slate-400 space-y-1">
            <li>• <code className="text-ocean-400">markdown</code> - Markdown text</li>
            <li>• <code className="text-ocean-400">text</code> - Plain text</li>
            <li>• <code className="text-ocean-400">html</code> - HTML content</li>
          </ul>
        </div>
      </section>

      <section id="url" className="space-y-6">
        <h2 className="text-2xl font-semibold text-white">URL Submissions</h2>
        <CodeBlock code={`{
  "payload": {
    "type": "url",
    "url": "https://my-deployed-app.vercel.app"
  }
}`} />
        <div className="card p-4 border-amber-500/25">
          <p className="text-amber-400 text-sm">⚠️ URL must be publicly accessible and use HTTPS</p>
        </div>
      </section>
    </div>
  );
}
