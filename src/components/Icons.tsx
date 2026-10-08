/** Small gradient feature icons used on the landing page. */

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <span className="feat-icon">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="url(#iconGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <linearGradient id="iconGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#06b6d4" />
            <stop offset="1" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        {children}
      </svg>
    </span>
  );
}

export const ShieldIcon = () => (
  <Wrap>
    <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </Wrap>
);

export const BellIcon = () => (
  <Wrap>
    <path d="M6 9a6 6 0 1112 0c0 4 1.5 5 2 6H4c.5-1 2-2 2-6z" />
    <path d="M10 19a2 2 0 004 0" />
  </Wrap>
);

export const LockIcon = () => (
  <Wrap>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 118 0v3" />
  </Wrap>
);

export const RocketIcon = () => (
  <Wrap>
    <path d="M5 15c-1 1-1 4-1 4s3 0 4-1" />
    <path d="M12 3c4 1 7 4 8 8-2 2-5 4-8 5-1-2-3-4-5-5 1-3 3-6 5-8z" />
    <circle cx="14.5" cy="9.5" r="1.5" />
  </Wrap>
);

export const SparkIcon = () => (
  <Wrap>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <path d="M12 8l1.5 2.5L16 12l-2.5 1.5L12 16l-1.5-2.5L8 12l2.5-1.5L12 8z" />
  </Wrap>
);

export const GlobeIcon = () => (
  <Wrap>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
  </Wrap>
);
