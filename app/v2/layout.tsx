import type { Metadata } from "next";
import { DM_Serif_Display, Syne, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// BRAND.md §4 — Display / H1
const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

// BRAND.md §4 — UI / Headings / Body
const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-syne",
});

// BRAND.md §4 — Queries / Code
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "TXLookup — Ask Texas anything.",
  description:
    "Every Texas public dataset. Any question. One real answer — sourced, cited, and plain-spoken.",
};

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${dmSerifDisplay.variable} ${syne.variable} ${ibmPlexMono.variable}`}
    >
      <body
        style={{
          fontFamily: "var(--font-syne), system-ui, sans-serif",
          background: "var(--tx-cream)",
          color: "var(--tx-ink)",
          margin: 0,
          padding: 0,
        }}
      >
        {children}
      </body>
    </html>
  );
}
