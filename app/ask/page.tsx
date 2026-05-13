// /ask — BYOK-gated query page. If a txl_byok cookie is present, render the
// full query form firing on the user's key. Otherwise redirect to /byok.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Shell } from "@/app/components/ds";

import { AskForm } from "./AskForm";

export const dynamic = "force-dynamic";

export default async function AskPage() {
  const jar = await cookies();
  const hasKey = Boolean(jar.get("txl_byok")?.value);
  if (!hasKey) redirect("/byok");

  return (
    <Shell active="/ask">
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
        <div className="mx-auto max-w-[820px] px-6 py-14 md:px-8 md:py-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ds-good)]">
            Your key · active
          </p>
          <h1 className="mt-3 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[40px]">
            Ask anything about Texas civic data.
          </h1>
          <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-[var(--ds-text-mute)]">
            The full multi-agent loop runs against your OpenAI key. ~$0.05 per question. Your result is saved to the public library so others benefit too — or mark it private in the form.
          </p>

          <AskForm />
        </div>
      </section>
    </Shell>
  );
}
