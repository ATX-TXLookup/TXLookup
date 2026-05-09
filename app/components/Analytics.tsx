/**
 * Google Analytics 4 — set NEXT_PUBLIC_GA_ID in env to enable.
 * If unset (e.g. local dev), the component renders nothing.
 *
 * Server component (no "use client") — emits the gtag bootstrap inline so
 * the GA script loads early in the document.
 */
import Script from "next/script";

export function Analytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID;
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
