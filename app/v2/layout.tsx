import type { Metadata } from "next";
import { DM_Serif_Display, Syne, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// BRAND.md §4 — Display / H1
const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-display", // shadows the v1 var so Tailwind font-display → DM Serif
});

// BRAND.md §4 — UI / Headings / Body
// Shadow --font-inter so Tailwind font-body / font-sans → Syne in v2
const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-inter",
});

// BRAND.md §4 — Queries / Code
// Shadow --font-jetbrains-mono so Tailwind font-mono → IBM Plex Mono in v2
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "TXLookup — Ask Texas anything.",
  description:
    "Every Texas public dataset. Any question. One real answer — sourced, cited, plain-spoken.",
};

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${dmSerifDisplay.variable} ${syne.variable} ${ibmPlexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
