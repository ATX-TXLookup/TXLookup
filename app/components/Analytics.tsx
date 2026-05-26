/**
 * Google Analytics 4 — defaults to the TXLookup property (G-19ZRJ9T0CX).
 * Override via NEXT_PUBLIC_GA_ID env (e.g. staging → different property).
 * Set NEXT_PUBLIC_GA_ID="" explicitly to disable (e.g. local dev).
 *
 * Server component (no "use client") — emits the gtag bootstrap inline so
 * the GA script loads early in the document.
 */
import Script from "next/script";

const DEFAULT_GA_ID = "G-19ZRJ9T0CX"; // TXLookup property (hackathon-acf11 / acct 3000023)

export function Analytics() {
  const env = process.env.NEXT_PUBLIC_GA_ID;
  const id = env === undefined ? DEFAULT_GA_ID : env;
  if (!id) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${id}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
