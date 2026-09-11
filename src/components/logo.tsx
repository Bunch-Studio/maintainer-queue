// A Q whose tail is a branch merging into the ring. Tail sits lower right so it never reads as a magnifying glass.
export const Logo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0" fill="none" strokeWidth="5" strokeLinecap="round">
    <circle cx="15" cy="15" r="9.5" stroke="var(--ink)" />
    <path d="M20.7 20.7 27.2 27.2" stroke="var(--accent)" />
  </svg>
);
