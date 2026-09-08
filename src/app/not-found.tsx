import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-10 font-mono text-sm">
      <p className="mb-4 text-ink-2">@@ -1 +0 @@ nothing here</p>
      <h1 className="font-display text-[clamp(32px,5vw,56px)] font-bold leading-none tracking-tight">
        <span className="diff-line bg-danger-soft text-danger">This page was never posted.</span>
      </h1>
      <p className="mt-6 max-w-[48ch] text-ink-2">The address may be stale, or the task it pointed at was removed. The board has everything that is open.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/board" className="btn inline-flex h-10 items-center rounded-md bg-ink px-4 text-sm font-medium text-ground">Open the board</Link>
        <Link href="/" className="btn inline-flex h-10 items-center rounded-md border border-hairline bg-surface px-4 text-sm font-medium">Home</Link>
      </div>
    </div>
  );
}
