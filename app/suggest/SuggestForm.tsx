"use client";

import { useState } from "react";

export function SuggestForm() {
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !question.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), question: question.trim() }),
      });
      if (!r.ok) {
        const { error: msg } = (await r.json().catch(() => ({}))) as { error?: string };
        setError(msg || `HTTP ${r.status}`);
        setBusy(false);
        return;
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-10 rounded-md border border-[var(--ds-good)]/40 bg-[var(--ds-bg-elev)] p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ds-good)]">
          Got it
        </p>
        <p className="mt-2 text-[16px] text-[var(--ds-text)]">
          We'll email you when this lands in the library. Browse <a href="/answers" className="text-[var(--ds-accent)] hover:underline">current investigations</a> while you wait.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-10 space-y-5">
      <label className="block">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ds-text-mute)]">
          Your email
        </span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
          className="mt-2 w-full rounded-sm border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] px-4 py-3 text-[15px] text-[var(--ds-text)] placeholder:text-[var(--ds-text-dim)] focus:border-[var(--ds-accent)] focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ds-text-mute)]">
          The question
        </span>
        <textarea
          required
          rows={4}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Which Texas school districts have the largest gap between bond issuance and graduation rate?"
          className="mt-2 w-full rounded-sm border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] px-4 py-3 text-[16px] leading-relaxed text-[var(--ds-text)] placeholder:text-[var(--ds-text-dim)] focus:border-[var(--ds-accent)] focus:outline-none"
        />
      </label>
      {error && (
        <p className="font-mono text-[12px] text-[var(--ds-bad)]">{error}</p>
      )}
      <button
        type="submit"
        disabled={busy || !email.trim() || !question.trim()}
        className="rounded-sm bg-white px-6 py-2.5 text-[14px] font-semibold text-[var(--ds-bg)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Sending…" : "Submit question →"}
      </button>
    </form>
  );
}
