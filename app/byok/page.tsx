// BYOK — bring your own OpenAI key. Stored in HTTP-only cookie scoped to
// /api/agent. After paste, redirects to /ask where the user gets a full
// query form firing on their key. Bypasses the server's $10 budget.

import { Shell } from "@/app/components/ds";

import { ByokForm } from "./ByokForm";

export const dynamic = "force-dynamic";

export default async function ByokPage() {
  return (
    <Shell active="/byok">
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
        <div className="mx-auto max-w-[760px] px-6 py-16 md:px-8 md:py-20">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-accent)]">
            Ask anything · Bring Your Own Key
          </p>
          <h1 className="mt-4 text-[40px] font-bold leading-[1.05] tracking-[-0.02em] text-[var(--ds-text)] md:text-[56px]">
            Want to ask your own question?
          </h1>
          <p className="mt-5 max-w-[58ch] text-[17px] leading-[1.6] text-[var(--ds-text-mute)]">
            The investigations on this site are curated — we pre-run them on our balance to keep the public library fast and free. To ask your own question, paste your own OpenAI API key below. Your key is stored in an HTTP-only cookie and used only when you submit a question. It is never sent to a database, logged, or shared.
          </p>

          <ByokForm />

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ds-good)]">
                How to get a key
              </p>
              <ol className="mt-3 space-y-1 text-[14px] text-[var(--ds-text)]">
                <li>1. Visit <a href="https://platform.openai.com/api-keys" className="text-[var(--ds-accent)] hover:underline">platform.openai.com/api-keys</a></li>
                <li>2. Click "Create new secret key"</li>
                <li>3. Paste it above</li>
                <li>4. ~$5 of credit covers ~100 deep questions</li>
              </ol>
            </div>
            <div className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ds-warm)]">
                Don't want to bring a key?
              </p>
              <p className="mt-3 text-[14px] text-[var(--ds-text)]">
                Leave us your email — we'll let you know when an investigation gets added to the public library that matches your interest.
              </p>
              <a
                href="/suggest"
                className="mt-4 inline-block rounded-sm border border-[var(--ds-border)] bg-[var(--ds-bg)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ds-text)] hover:border-[var(--ds-accent)] hover:text-[var(--ds-accent)]"
              >
                Suggest a question →
              </a>
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}
