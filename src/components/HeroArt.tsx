/**
 * Animated hero illustration: a stylized portfolio card with an upward,
 * self-drawing chart line and floating crypto "coin" badges. All motion is
 * CSS-driven (see globals.css: .float, .draw-line, .orb).
 */
export default function HeroArt() {
  return (
    <div className="hero-art" aria-hidden="true">
      {/* soft background orbs */}
      <span className="orb orb-a" />
      <span className="orb orb-b" />
      <span className="orb orb-c" />

      <svg viewBox="0 0 420 360" fill="none" xmlns="http://www.w3.org/2000/svg" className="hero-svg">
        <defs>
          <linearGradient id="cardGrad" x1="40" y1="60" x2="380" y2="320" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" />
            <stop offset="1" stopColor="#f2f7ff" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="60" y1="240" x2="360" y2="120" gradientUnits="userSpaceOnUse">
            <stop stopColor="#06b6d4" />
            <stop offset="1" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="areaGrad" x1="0" y1="120" x2="0" y2="270" gradientUnits="userSpaceOnUse">
            <stop stopColor="#22d3ee" stopOpacity="0.28" />
            <stop offset="1" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="18" stdDeviation="22" floodColor="#2b3a80" floodOpacity="0.16" />
          </filter>
        </defs>

        {/* main card */}
        <g filter="url(#softShadow)">
          <rect x="46" y="54" width="328" height="252" rx="22" fill="url(#cardGrad)" />
        </g>
        <rect x="46" y="54" width="328" height="252" rx="22" fill="none" stroke="#e5edfb" />

        {/* card header */}
        <circle cx="74" cy="84" r="7" fill="#22d3ee" />
        <rect x="90" y="79" width="92" height="10" rx="5" fill="#e3ebfa" />
        <rect x="300" y="78" width="52" height="14" rx="7" fill="#eafff8" />
        <rect x="308" y="82" width="36" height="6" rx="3" fill="#13c9a6" />

        {/* chart area fill */}
        <path
          d="M70 250 L70 236 C120 214 150 210 186 196 C224 182 250 150 290 140 C320 132 342 118 360 110 L360 250 Z"
          fill="url(#areaGrad)"
        />
        {/* chart line (self-draws) */}
        <path
          className="draw-line"
          d="M70 236 C120 214 150 210 186 196 C224 182 250 150 290 140 C320 132 342 118 360 110"
          stroke="url(#lineGrad)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        {/* point markers */}
        <circle className="float f1" cx="186" cy="196" r="6" fill="#06b6d4" stroke="#fff" strokeWidth="3" />
        <circle className="float f2" cx="360" cy="110" r="7" fill="#7c3aed" stroke="#fff" strokeWidth="3" />

        {/* stat chips */}
        <rect x="70" y="270" width="86" height="20" rx="10" fill="#eef3ff" />
        <rect x="166" y="270" width="64" height="20" rx="10" fill="#eef3ff" />
        <rect x="240" y="270" width="110" height="20" rx="10" fill="#eef3ff" />
      </svg>

      {/* floating coin badges */}
      <div className="coin coin-x float f1">X</div>
      <div className="coin coin-eth float f2">Ξ</div>
      <div className="coin coin-btc float f3">₿</div>
    </div>
  );
}
