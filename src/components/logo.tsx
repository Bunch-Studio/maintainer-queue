// The queue: three items, the bottom one being worked.
export const Logo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
    <rect width="32" height="32" rx="7" fill="var(--ink)" />
    <rect x="7" y="8" width="18" height="3.5" rx="1.75" fill="var(--ground)" opacity="0.55" />
    <rect x="7" y="14.25" width="18" height="3.5" rx="1.75" fill="var(--ground)" opacity="0.55" />
    <rect x="7" y="20.5" width="18" height="3.5" rx="1.75" fill="var(--accent)" />
  </svg>
);
