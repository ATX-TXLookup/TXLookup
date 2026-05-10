// /chat — conversational support agent.
// Free-form chat about TXLookup itself: what data we have, how the agent
// works, what columns mean, vague-geography clarification.
// Uses the same support specialist that fires inside /q for meta queries —
// here it's surfaced as a standalone chatbot so users can explore the
// system without committing to a single data question.

import { Shell } from "@/app/components/ds";
import ChatRoom from "./ChatRoom";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  return (
    <Shell active="/chat">
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[900px] px-6 py-10 md:px-8 md:py-14">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-purple)]">
            Support agent · conversational
          </p>
          <h1 className="mt-3 text-[36px] font-bold leading-[1.05] tracking-[-0.02em] text-[var(--ds-text)] md:text-[52px]">
            Talk to TXLookup.
          </h1>
          <p className="mt-4 max-w-[60ch] text-[15px] leading-relaxed text-[var(--ds-text-mute)] md:text-[17px]">
            Ask what data we have, what a column means, or which dataset best fits your question. The catalog spans <span className="text-[var(--ds-text)]">6,061 Texas datasets across 6 portals</span> — 9 are deeply curated, the rest are queryable on demand. This chat is backed by the <span className="text-[var(--ds-text)]">support specialist</span>, the same agent the planner delegates to inside <a href="/q" className="text-[var(--ds-accent)] hover:underline">/q</a> for meta questions. No SoQL fired, no Socrata hit — just answers about the system.
          </p>
        </div>
      </section>
      <section>
        <div className="mx-auto max-w-[900px] px-6 py-10 md:px-8 md:py-14">
          <ChatRoom />
        </div>
      </section>
    </Shell>
  );
}
