import type { Metadata } from "next";
import { DM_Serif_Display, IBM_Plex_Mono, Syne } from "next/font/google";
import "./globals.css";

import { Analytics } from "./components/Analytics";

// Brand fonts per BRAND.md §4.
// Variable names (--font-display, --font-inter, --font-jetbrains-mono)
// stay the same as before so the existing Tailwind classes
// (font-display, font-body, font-mono) keep working — they now point
// at brand fonts everywhere instead of Public Sans / Inter / JetBrains Mono.

// Display / H1 — DM Serif Display (regular + italic for emphasis)
const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400"],
  style: ["normal", "italic"],
});

// UI / Headings / Body — Syne (400 / 700 / 800)
const syne = Syne({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "700", "800"],
});

// Queries / Code — IBM Plex Mono (400 / 600)
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "TXLookup — Ask Texas anything.",
  description:
    "Every Texas public dataset. Any question. One real answer — sourced, cited, plain-spoken.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${dmSerifDisplay.variable} ${syne.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        <Analytics />
        {children}
      </body>
    </html>
  );
}
