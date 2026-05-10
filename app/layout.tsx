import type { Metadata } from "next";
import {
  DM_Serif_Display,
  Geist,
  Geist_Mono,
  IBM_Plex_Mono,
  Instrument_Serif,
  Syne,
} from "next/font/google";
import "./globals.css";

import { Analytics } from "./components/Analytics";

// Geist (Vercel's sans + mono) — used by the dark tool-first homepage and
// the topology showcase. Loaded as --font-geist / --font-geist-mono.
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  weight: ["400", "500", "600", "700", "800"],
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  weight: ["400", "500", "600"],
});

// Instrument Serif — italic display headlines (Undervolt-ATX style).
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400"],
  style: ["normal", "italic"],
});

// Brand fonts (Godwyn's BRAND.md §4) — still loaded for /q + /reports +
// /datasets and any page that uses font-display / font-body / font-mono.
const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400"],
  style: ["normal", "italic"],
});
const syne = Syne({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "700", "800"],
});
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
      className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable} ${dmSerifDisplay.variable} ${syne.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        <Analytics />
        {children}
      </body>
    </html>
  );
}
