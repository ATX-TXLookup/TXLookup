// BRAND.md §8 — Lone Star Intelligence logo mark + wordmark
export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 80"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="TXLookup"
    >
      {/* Star mark */}
      <polygon
        points="20,6 22.5,13 30,13 24,17.5 26.5,25 20,20.5 13.5,25 16,17.5 10,13 17.5,13"
        fill="none"
        stroke="#D48B10"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="15.5" r="1.5" fill="#D48B10" />
      {/* Data nodes */}
      <line x1="20" y1="25" x2="20" y2="33" stroke="rgba(58,127,190,0.5)" strokeWidth="0.5" />
      <line x1="20" y1="29" x2="13" y2="35" stroke="rgba(58,127,190,0.4)" strokeWidth="0.5" />
      <line x1="20" y1="29" x2="27" y2="35" stroke="rgba(58,127,190,0.4)" strokeWidth="0.5" />
      <circle cx="20" cy="34" r="1.5" fill="#3A7FBE" />
      <circle cx="12.5" cy="36" r="1.5" fill="#3A7FBE" />
      <circle cx="27.5" cy="36" r="1.5" fill="#3A7FBE" />
      {/* TX in gold */}
      <text
        x="38" y="26"
        fontFamily="'Syne',sans-serif"
        fontSize="22"
        fontWeight="800"
        fill="#D48B10"
        letterSpacing="1"
      >TX</text>
      {/* Lookup in cream */}
      <text
        x="68" y="26"
        fontFamily="'Syne',sans-serif"
        fontSize="22"
        fontWeight="400"
        fill="#FAF7F2"
        letterSpacing="0.5"
      >Lookup</text>
      {/* Tagline */}
      <text
        x="38" y="38"
        fontFamily="'IBM Plex Mono',monospace"
        fontSize="7"
        fontWeight="400"
        fill="rgba(255,255,255,0.35)"
        letterSpacing="1.5"
      >TEXAS PUBLIC INTELLIGENCE</text>
    </svg>
  );
}
