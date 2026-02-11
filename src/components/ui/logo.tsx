"use client";

interface LogoProps {
  variant?: "full" | "icon" | "wordmark";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: { icon: 24, wordmark: 14, gap: 6 },
  md: { icon: 32, wordmark: 18, gap: 8 },
  lg: { icon: 40, wordmark: 22, gap: 10 },
  xl: { icon: 56, wordmark: 32, gap: 14 },
};

function LogoIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Rounded container */}
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="12"
        stroke="var(--sa-200, #f6cb63)"
        strokeWidth="2.5"
        fill="rgba(246, 203, 99, 0.06)"
      />

      {/* Stylized S — two arcs that flow upward, suggesting growth */}
      <path
        d="M17 32.5C17 32.5 17 28.5 21.5 26.5C26 24.5 31 23 31 19C31 15 27 14 24 14C21 14 18.5 15.5 17.5 17"
        stroke="var(--sa-200, #f6cb63)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M31 15.5C31 15.5 31 19.5 26.5 21.5C22 23.5 17 25 17 29C17 33 21 34 24 34C27 34 29.5 32.5 30.5 31"
        stroke="var(--sa-200, #f6cb63)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Small upward arrow accent at top-right — growth indicator */}
      <path
        d="M34 10L37.5 6.5M37.5 6.5L41 10M37.5 6.5V13"
        stroke="var(--sa-100, #fce8b4)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoWordmark({ fontSize = 18 }: { fontSize?: number }) {
  return (
    <span
      style={{
        fontSize: `${fontSize}px`,
        fontWeight: 600,
        letterSpacing: "0.18em",
        color: "var(--sa-200, #f6cb63)",
        fontFamily: '"Manrope", sans-serif',
        textTransform: "uppercase" as const,
        lineHeight: 1,
      }}
    >
      Seller
      <span style={{ color: "var(--sa-100, #fce8b4)" }}>Aide</span>
    </span>
  );
}

export function Logo({ variant = "full", size = "md", className }: LogoProps) {
  const s = sizes[size];

  if (variant === "icon") {
    return (
      <div className={className}>
        <LogoIcon size={s.icon} />
      </div>
    );
  }

  if (variant === "wordmark") {
    return (
      <div className={className}>
        <LogoWordmark fontSize={s.wordmark} />
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ display: "flex", alignItems: "center", gap: `${s.gap}px` }}
    >
      <LogoIcon size={s.icon} />
      <LogoWordmark fontSize={s.wordmark} />
    </div>
  );
}
