// /suggest — email-gated form for proposing lookups. We don't run on
// the owner's balance for anonymous users; instead, capture email + question,
// admin reviews + runs the worthy ones, they show up in /answers.

import { Shell } from "@/app/components/ds";

import { SuggestForm } from "./SuggestForm";

export const dynamic = "force-dynamic";

export default async function SuggestPage() {
  return (
    <Shell active="/suggest">
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
        <div className="mx-auto max-w-[760px] px-6 py-16 md:px-8 md:py-20">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-warm)]">
            Suggest a lookup
          </p>
          <h1 className="mt-4 text-[36px] font-bold leading-[1.08] tracking-[-0.02em] text-[var(--ds-text)] md:text-[48px]">
            What should we look up next?
          </h1>
          <p className="mt-5 max-w-[58ch] text-[16px] leading-[1.65] text-[var(--ds-text-mute)]">
            We curate the public library by hand — high-effort, high-signal lookups on Texas civic data. Tell us what you'd want answered and we'll email you when (and if) it lands. No spam, no sales.
          </p>

          <SuggestForm />

          <p className="mt-10 max-w-[58ch] text-[14px] text-[var(--ds-text-mute)]">
            Want to ask your own question right now? <a href="/byok" className="text-[var(--ds-accent)] hover:underline">Bring your own OpenAI key →</a>
          </p>
        </div>
      </section>
    </Shell>
  );
}
