"use client";

import { useState } from "react";

export const CopyButton = ({ text, label = "Copy" }: { text: string; label?: string }) => {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 1600);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={`btn inline-flex h-8 items-center rounded-md border px-2.5 font-mono text-xs transition-colors ${
        state === "copied" ? "border-accent bg-accent-soft text-accent" : state === "failed" ? "border-danger text-danger" : "border-hairline bg-surface text-ink-2 hover:text-ink"
      }`}
      aria-live="polite"
    >
      {state === "copied" ? "Copied" : state === "failed" ? "Select and copy" : label}
    </button>
  );
};
