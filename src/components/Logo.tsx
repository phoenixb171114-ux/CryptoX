/**
 * GoodCryptoX brand mark: a security shield (self-custody) with a bold "X",
 * using the brand teal→violet gradient. Pairs with the wordmark.
 */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="logo-mark"
    >
      <defs>
        <linearGradient id="gcxGrad" x1="2" y1="2" x2="38" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" />
          <stop offset="0.5" stopColor="#06b6d4" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <path
        d="M20 2L35 7.5V22C35 31.5 28.5 38.5 20 41.5C11.5 38.5 5 31.5 5 22V7.5L20 2Z"
        fill="url(#gcxGrad)"
      />
      <path
        d="M20 2L35 7.5V22C35 31.5 28.5 38.5 20 41.5C11.5 38.5 5 31.5 5 22V7.5L20 2Z"
        fill="white"
        fillOpacity="0.08"
      />
      <path
        d="M14 15.5L26 28.5M26 15.5L14 28.5"
        stroke="white"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="brand">
      <LogoMark size={size} />
      <span className="brand-text">
        GoodCrypto<b>X</b>
      </span>
    </span>
  );
}
