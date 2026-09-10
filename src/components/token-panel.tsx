"use client";

import { useState, useTransition } from "react";
import { createAgentToken, revokeAgentToken } from "@/app/dashboard/actions";
import { CopyButton } from "@/components/copy-button";

type Token = { id: string; label: string; created_at: string; last_used_at: string | null };

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

const TokenRow = ({ t }: { t: Token }) => {
  const [pending, start] = useTransition();
  return (
    <li className="flex items-center justify-between gap-4 py-2.5">
      <span className="min-w-0">
        <span className="block truncate font-mono text-sm text-ink">{t.label}</span>
        <span className="block font-mono text-xs text-ink-2">issued {day(t.created_at)} · {t.last_used_at ? `last used ${day(t.last_used_at)}` : "never used"}</span>
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => { await revokeAgentToken(t.id); })}
        className="btn shrink-0 rounded px-1.5 py-0.5 font-mono text-xs text-ink-2 hover:text-danger disabled:opacity-50"
      >
        {pending ? "revoking…" : "revoke"}
      </button>
    </li>
  );
};

const Block = ({ title, text }: { title: string; text: string }) => (
  <div className="overflow-hidden rounded-md border border-hairline">
    <div className="flex items-center justify-between gap-3 border-b border-hairline bg-ground px-3 py-1.5">
      <span className="font-mono text-xs text-ink-2">{title}</span>
      <CopyButton text={text} />
    </div>
    <pre className="whitespace-pre-wrap [overflow-wrap:anywhere] px-3 py-2.5 font-mono text-xs leading-relaxed">{text}</pre>
  </div>
);

export const TokenPanel = ({ siteUrl, tokens }: { siteUrl: string; tokens: Token[] }) => {
  const [token, setToken] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const bearer = token ?? "<your token>";
  const url = `${siteUrl}/api/mcp`;
  const command = `claude mcp add --transport http maintainer-queue ${url} --header "Authorization: Bearer ${bearer}"`;
  const json = JSON.stringify({ mcpServers: { "maintainer-queue": { type: "http", url, headers: { Authorization: `Bearer ${bearer}` } } } }, null, 2);

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight">Agent token</h2>
          <p className="text-sm text-ink-2">{tokens.length > 0 ? `${tokens.length} active token${tokens.length === 1 ? "" : "s"}.` : "None active yet."}</p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => { const r = await createAgentToken(); setToken(r.token); })}
          className="btn h-9 shrink-0 rounded-md bg-ink px-3 text-sm font-medium text-ground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create token"}
        </button>
      </div>

      {token && (
        <div className="mb-4 rounded-md bg-accent-soft px-3 py-2.5" role="status">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 break-all font-mono text-xs text-ink">{token}</p>
            <CopyButton text={token} label="Copy token" />
          </div>
          <p className="mt-1.5 font-mono text-xs text-accent">Copy it now. It is not shown again, and the setup below already includes it.</p>
        </div>
      )}

      {tokens.length > 0 && (
        <ul className="mb-5 divide-y divide-hairline border-y border-hairline">
          {tokens.map((t) => <TokenRow key={t.id} t={t} />)}
        </ul>
      )}

      <div className="space-y-3">
        <Block title="Claude Code · run once in a terminal" text={command} />
        <details className="group">
          <summary className="cursor-pointer list-none font-mono text-xs text-ink-2 hover:text-ink">
            <span className="mr-1 inline-block transition-transform group-open:rotate-90">›</span>Other agents · .mcp.json
          </summary>
          <div className="mt-3"><Block title=".mcp.json" text={json} /></div>
        </details>
      </div>
    </div>
  );
};
