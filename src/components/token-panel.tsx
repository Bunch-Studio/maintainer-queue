"use client";

import { useState, useTransition } from "react";
import { createAgentToken } from "@/app/dashboard/actions";
import { CopyButton } from "@/components/copy-button";

export const TokenPanel = ({ siteUrl, existing }: { siteUrl: string; existing: number }) => {
  const [token, setToken] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const config = JSON.stringify(
    { mcpServers: { "maintainer-queue": { type: "http", url: `${siteUrl}/api/mcp`, headers: { Authorization: `Bearer ${token ?? "<your token>"}` } } } },
    null,
    2,
  );

  return (
    <div className="border border-hairline rounded-md bg-surface p-5 shadow-[0_1px_0_var(--hairline),0_8px_24px_-16px_rgba(0,0,0,0.3)]">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="font-bold text-lg">Agent token</h2>
          <p className="text-sm text-ink-2">Shown once. {existing > 0 ? `${existing} token${existing === 1 ? "" : "s"} issued so far.` : "None issued yet."}</p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => { const r = await createAgentToken(); setToken(r.token); })}
          className="h-9 px-3 rounded-md bg-ink text-ground text-sm font-medium hover:opacity-90 active:opacity-80 disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create token"}
        </button>
      </div>
      {token && (
        <div className="mb-3 flex items-center gap-2 rounded bg-accent-soft px-3 py-2" role="status">
          <p className="min-w-0 flex-1 break-all font-mono text-xs text-ink">{token}</p>
          <CopyButton text={token} label="Copy token" />
        </div>
      )}
      <p className="text-sm text-ink-2 mb-2">Claude Code: add to <code className="font-mono">.mcp.json</code>. Other agents: same URL and header.</p>
      <div className="relative">
        <pre className="font-mono text-xs overflow-x-auto rounded-md border border-hairline p-3 pr-20 leading-relaxed">{config}</pre>
        <div className="absolute right-2 top-2"><CopyButton text={config} /></div>
      </div>
    </div>
  );
};
