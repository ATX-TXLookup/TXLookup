"use client";

import { useState } from "react";

export function ByokForm() {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const k = key.trim();
    if (!k.startsWith("sk-")) {
      setError("That doesn't look like an OpenAI key (should start with sk-).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/byok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: k }),
      });
      if (!r.ok) {
        const { error: msg } = (await r.json().catch(() => ({}))) as { error?: string };
        setError(msg || `HTTP ${r.status}`);
        setBusy(false);
        return;
      }
      // Cookie set server-side. Redirect to /ask.
      window.location.href = "/ask";
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-10 max-w-[640px]">
      <label className="block">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ds-text-mute)]">
          Your OpenAI API key
        </span>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-proj-…"
          autoComplete="off"
          className="mt-2 w-full rounded-sm border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] px-4 py-3 font-mono text-[14px] text-[var(--ds-text)] placeholder:text-[var(--ds-text-dim)] focus:border-[var(--ds-accent)] focus:outline-none"
        />
      </label>
      {error && (
        <p className="mt-3 font-mono text-[12px] text-[var(--ds-bad)]">{error}</p>
      )}
      <button
        type="submit"
        disabled={busy || !key.trim()}
        className="mt-5 rounded-sm bg-[var(--ds-inverse-bg)] px-6 py-2.5 text-[14px] font-semibold text-[var(--ds-inverse-text)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Verifying…" : "Use this key →"}
      </button>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
        Stored in an HTTP-only cookie · 7-day TTL · clearable from /settings
      </p>
    </form>
  );
}
