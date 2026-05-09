import type { Config } from "tailwindcss";

/**
 * TXLookup Tailwind config.
 *
 * Token source of truth: /DESIGN.md (front-matter).
 * Keep this file in lockstep with DESIGN.md — when a token changes there,
 * mirror it here. Do not introduce new colors here without first adding
 * them to DESIGN.md.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,js,jsx,mdx}",
    "./components/**/*.{ts,tsx,js,jsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary (ember)
        primary: {
          DEFAULT: "#9E3D00",
          container: "#C64F00",
          fixed: "#FFDBCD",
          "fixed-dim": "#FFB595",
        },
        "on-primary": "#FFFFFF",
        "on-primary-fixed": "#351000",

        // Secondary (civic blue / bluebonnet)
        secondary: {
          DEFAULT: "#3D5AAB",
          container: "#5673BD",
          fixed: "#DCE3FA",
        },
        "on-secondary": "#FFFFFF",
        "on-secondary-fixed": "#0E1F4D",
        "on-secondary-container": "#656464",

        // Surfaces (warm stone)
        surface: {
          DEFAULT: "#FCF9F8",
          low: "#F6F3F2",
          container: "#F0EDEC",
          high: "#EBE7E7",
          highest: "#E5E2E1",
          lowest: "#FFFFFF",
          dim: "#DCD9D9",
        },
        "on-surface": "#1C1B1B",
        "on-surface-variant": "#594238",
        "inverse-surface": "#111110",
        "inverse-on-surface": "#F3F0EF",

        outline: {
          DEFAULT: "#8C7166",
          variant: "#E0C0B2",
        },

        // Signal trio
        signal: {
          pass: "#1E7A47",
          "pass-fixed": "#D5F0DF",
          warn: "#A06200",
          "warn-fixed": "#FFE7B5",
          fail: "#A0231C",
          "fail-fixed": "#FBD5D2",
        },

        // District palette
        district: {
          1: "#3D5AAB",
          2: "#1E7A47",
          3: "#A06200",
          4: "#7A2E8E",
          5: "#0E7C8C",
          6: "#A0231C",
          7: "#5A4E2A",
          8: "#2E5070",
          9: "#883C5A",
          10: "#3E6B2E",
        },
      },
      fontFamily: {
        display: ["Manrope", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        // tokens from DESIGN.md typography
        "display": ["4.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "800" }],
        "h1": ["3rem", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "800" }],
        "h2": ["2.25rem", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "800" }],
        "h3": ["1.375rem", { lineHeight: "1.2", fontWeight: "700" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["1rem", { lineHeight: "1.6", fontWeight: "400" }],
        "body-sm": ["0.875rem", { lineHeight: "1.55", fontWeight: "400" }],
        "label-caps": ["0.6875rem", { letterSpacing: "0.14em", fontWeight: "700" }],
        "mono": ["0.85rem", { fontWeight: "400" }],
      },
      borderRadius: {
        sm: "6px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
      spacing: {
        // DESIGN.md spacing scale (Tailwind already covers most; add named)
        "4xl": "96px",
      },
      boxShadow: {
        "card-rest": "0 1px 0 rgba(140,113,102,0.12)",
        "card-hover": "0 20px 50px -15px rgba(158,61,0,0.08)",
        "input-focus": "0 0 0 4px rgba(158,61,0,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
