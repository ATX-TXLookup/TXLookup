import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Public_Sans } from "next/font/google";
import "./globals.css";

// Public Sans — the US Web Design System font. Civic-portal authoritative.
const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "900"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "TXLookup — Texas open data, in plain English",
  description:
    "Ask a question about Texas public data. The agent finds the dataset, queries it, cites the source, and gives you a real answer.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${publicSans.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
