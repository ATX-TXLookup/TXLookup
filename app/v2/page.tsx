"use client";

import { useState, useRef } from "react";
import { Logo } from "./components/Logo";
import { CATALOG } from "@/app/lib/catalog";

// BRAND.md §7 — Dataset Insight Badge
function InsightBadge({ text }: { text: string }) {
  return (
    <span
      style={{
        background: "var(--tx-gold-light)",
        color: "var(--tx-gold)",
        fontFamily: "var(--font-mono), monospace",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.08em",
        padding: "4px 12px",
        borderRadius: "100px",
        border: "0.5px solid rgba(212,139,16,0.3)",
        textTransform: "uppercase",
        display: "inline-block",
      }}
    >
      {text}
    </span>
  );
}

// BRAND.md §7 — Dataset Card
function DatasetCard({ dataset }: { dataset: (typeof CATALOG)[0] }) {
  const cadenceLabel =
    dataset.cadence === "daily"
      ? "Live daily"
      : dataset.cadence === "weekly"
      ? "Updated weekly"
      : dataset.cadence === "monthly"
      ? "Updated monthly"
      : "Quarterly";

  return (
    <div
      style={{
        background: "var(--tx-cream)",
        border: "0.5px solid var(--tx-border)",
        borderRadius: "10px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        transition: "box-shadow 0.15s ease",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 20px 50px -15px rgba(13,35,64,0.12)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLDivElement).style.boxShadow = "none")
      }
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <h3
          style={{
            fontFamily: "var(--font-syne), sans-serif",
            fontWeight: 700,
            fontSize: "15px",
            color: "var(--tx-navy)",
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {dataset.title}
        </h3>
        <InsightBadge text={cadenceLabel} />
      </div>

      <p
        style={{
          fontFamily: "var(--font-syne), sans-serif",
          fontSize: "13px",
          color: "var(--tx-muted)",
          margin: 0,
          lineHeight: 1.6,
        }}
      >
        {dataset.blurb}
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
        <span
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "11px",
            color: "var(--tx-sky)",
            letterSpacing: "0.04em",
          }}
        >
          {dataset.rows ?? "—"} rows · {dataset.portal}
        </span>
        <a
          href={`/datasets/${dataset.id}`}
          style={{
            background: "var(--tx-rust)",
            color: "white",
            fontFamily: "var(--font-syne), sans-serif",
            fontWeight: 700,
            fontSize: "13px",
            borderRadius: "8px",
            padding: "8px 16px",
            textDecoration: "none",
            display: "inline-block",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = "0.85")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = "1")}
        >
          Explore →
        </a>
      </div>
    </div>
  );
}

// BRAND.md §7 — Query Input
function QueryInput({
  value,
  onChange,
  onSubmit,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      style={{ display: "flex", gap: "10px", width: "100%", maxWidth: "680px" }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder='e.g. "Which Austin zip has the worst food inspection scores?"'
        style={{
          flex: 1,
          fontFamily: "var(--font-mono), monospace",
          fontSize: "14px",
          background: "rgba(13,35,64,0.85)",
          color: "var(--tx-cream)",
          border: "0.5px solid rgba(58,127,190,0.4)",
          borderRadius: "8px",
          padding: "14px 18px",
          caretColor: "var(--tx-gold)",
          outline: "none",
          backdropFilter: "blur(4px)",
        }}
        onFocus={(e) =>
          ((e.currentTarget as HTMLInputElement).style.borderColor =
            "rgba(58,127,190,0.8)")
        }
        onBlur={(e) =>
          ((e.currentTarget as HTMLInputElement).style.borderColor =
            "rgba(58,127,190,0.4)")
        }
      />
      <button
        type="submit"
        disabled={loading || !value.trim()}
        style={{
          background: loading ? "var(--tx-muted)" : "var(--tx-rust)",
          color: "white",
          fontFamily: "var(--font-syne), sans-serif",
          fontWeight: 700,
          fontSize: "14px",
          borderRadius: "8px",
          padding: "14px 24px",
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          whiteSpace: "nowrap",
          transition: "opacity 0.15s",
        }}
      >
        {loading ? "Thinking…" : "Ask Texas"}
      </button>
    </form>
  );
}

export default function V2Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [citation, setCitation] = useState<string | null>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  const suggested = [
    "Which Austin restaurants failed their last inspection?",
    "Top zip codes for new building permits in 2025",
    "Worst traffic crash streets in Austin",
    "Top bars in Austin by liquor receipts",
  ];

  async function handleSubmit() {
    if (!query.trim()) return;
    setLoading(true);
    setAnswer(null);
    setCitation(null);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        for (const chunk of buffer.split("\n\n")) {
          if (!chunk.startsWith("data:")) continue;
          try {
            const evt = JSON.parse(chunk.slice(5).trim());
            if (evt.phase === "done") {
              setAnswer(evt.answer ?? null);
              setCitation(evt.citation ?? null);
              answerRef.current?.scrollIntoView({ behavior: "smooth" });
            }
          } catch {
            // partial chunk
          }
        }
        buffer = buffer.includes("\n\n")
          ? buffer.slice(buffer.lastIndexOf("\n\n") + 2)
          : buffer;
      }
    } catch (err) {
      setAnswer("Something went wrong — check the console.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── Nav ── */}
      <nav
        style={{
          background: "var(--tx-navy)",
          padding: "0 24px",
          height: "56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "0.5px solid rgba(255,255,255,0.06)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <Logo style={{ height: "40px", width: "auto" }} />
        <a
          href="/datasets"
          style={{
            color: "rgba(250,247,242,0.55)",
            fontFamily: "var(--font-syne), sans-serif",
            fontSize: "13px",
            fontWeight: 700,
            textDecoration: "none",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          All Datasets
        </a>
      </nav>

      {/* ── Hero ── */}
      <section
        style={{
          background: "var(--tx-navy)",
          backgroundImage:
            "radial-gradient(circle at 80% 30%, rgba(58,127,190,0.18) 0%, transparent 55%), radial-gradient(circle at 10% 80%, rgba(196,66,10,0.12) 0%, transparent 50%)",
          padding: "80px 24px 72px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: "24px",
        }}
      >
        {/* Eyebrow */}
        <span
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--tx-sky)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          Texas Public Intelligence
        </span>

        {/* H1 — BRAND.md: DM Serif Display 48px white */}
        <h1
          style={{
            fontFamily: "var(--font-display), serif",
            fontSize: "clamp(36px, 6vw, 56px)",
            fontWeight: 400,
            color: "#FAF7F2",
            margin: 0,
            lineHeight: 1.1,
            maxWidth: "640px",
          }}
        >
          Ask Texas anything.
        </h1>

        {/* Sub — BRAND.md: Syne 700 gold */}
        <p
          style={{
            fontFamily: "var(--font-syne), sans-serif",
            fontWeight: 700,
            fontSize: "18px",
            color: "var(--tx-gold)",
            margin: 0,
          }}
        >
          Public data. Real answers.
        </p>

        {/* Query input */}
        <div style={{ width: "100%", display: "flex", justifyContent: "center", marginTop: "8px" }}>
          <QueryInput
            value={query}
            onChange={setQuery}
            onSubmit={handleSubmit}
            loading={loading}
          />
        </div>

        {/* Suggested queries */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginTop: "4px" }}>
          {suggested.map((s) => (
            <button
              key={s}
              onClick={() => setQuery(s)}
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "12px",
                color: "rgba(58,127,190,0.85)",
                background: "rgba(58,127,190,0.08)",
                border: "0.5px solid rgba(58,127,190,0.25)",
                borderRadius: "100px",
                padding: "6px 14px",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(58,127,190,0.16)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(58,127,190,0.08)")
              }
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {/* ── Answer panel ── */}
      {(loading || answer) && (
        <section
          ref={answerRef}
          style={{
            background: "var(--tx-gold-light)",
            borderTop: "0.5px solid rgba(212,139,16,0.25)",
            padding: "32px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ width: "100%", maxWidth: "700px" }}>
            {loading && (
              <p
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: "13px",
                  color: "var(--tx-muted)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              >
                ⠿ Querying Texas open data…
              </p>
            )}
            {answer && (
              <>
                <p
                  style={{
                    fontFamily: "var(--font-syne), sans-serif",
                    fontSize: "16px",
                    lineHeight: 1.7,
                    color: "var(--tx-ink)",
                    margin: "0 0 16px",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {answer}
                </p>
                {citation && (
                  <p
                    style={{
                      fontFamily: "var(--font-mono), monospace",
                      fontSize: "11px",
                      color: "var(--tx-muted)",
                      margin: 0,
                    }}
                  >
                    Source: {citation}
                  </p>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* ── Dataset grid ── */}
      <section style={{ padding: "56px 24px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "32px" }}>
          <h2
            style={{
              fontFamily: "var(--font-display), serif",
              fontSize: "28px",
              fontWeight: 400,
              color: "var(--tx-navy)",
              margin: 0,
            }}
          >
            Explore the datasets
          </h2>
          <span
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "11px",
              color: "var(--tx-muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {CATALOG.length} datasets
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "16px",
          }}
        >
          {CATALOG.map((ds) => (
            <DatasetCard key={ds.id} dataset={ds} />
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          marginTop: "auto",
          background: "var(--tx-navy)",
          padding: "32px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <Logo style={{ height: "32px", width: "auto", opacity: 0.8 }} />
        <p
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "11px",
            color: "rgba(250,247,242,0.35)",
            margin: 0,
            letterSpacing: "0.08em",
          }}
        >
          Data sourced from data.texas.gov · data.austintexas.gov · datahub.austintexas.gov
        </p>
      </footer>
    </div>
  );
}
