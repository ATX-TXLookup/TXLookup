// /docs/[[...slug]] — render the docs-site/ MDX pages on Vercel.
// Reads the MDX files at build time, parses frontmatter + body, renders
// with react-markdown + GFM (tables, code, links).
//
// Skipping Mintlify hosting per user choice. Same content, native to the
// app, single Shell chrome, no third-party redirect.

import { notFound } from "next/navigation";
import Link from "next/link";
import { promises as fs } from "fs";
import path from "path";
import matter from "gray-matter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Shell } from "@/app/components/ds";

const DOCS_DIR = path.join(process.cwd(), "docs-site");

// Source of truth: keep in sync with docs-site/mint.json.
type Section = {
  group: string;
  pages: { slug: string; label: string }[];
};

const NAV: Section[] = [
  {
    group: "Get started",
    pages: [
      { slug: "introduction", label: "Introduction" },
      { slug: "quickstart", label: "Quickstart" },
    ],
  },
  {
    group: "MCP server",
    pages: [
      { slug: "mcp/install", label: "Install the MCP server" },
      { slug: "mcp/tools", label: "Tool catalog (8)" },
    ],
  },
  {
    group: "Agent skill",
    pages: [
      { slug: "skill/install", label: "Install the skill" },
      { slug: "skill/safety", label: "Safety rules" },
    ],
  },
  {
    group: "Architecture",
    pages: [
      { slug: "agent/architecture", label: "Loop architecture" },
      { slug: "agent/datasets", label: "Curated datasets" },
    ],
  },
];

const ALL_SLUGS = NAV.flatMap((s) => s.pages.map((p) => p.slug));

export async function generateStaticParams() {
  return [
    { slug: [] }, // /docs index
    ...ALL_SLUGS.map((s) => ({ slug: s.split("/") })),
  ];
}

async function loadDoc(slug: string[]): Promise<{
  title: string;
  description: string;
  content: string;
  slugStr: string;
} | null> {
  const slugStr = slug.length === 0 ? "introduction" : slug.join("/");
  const filePath = path.join(DOCS_DIR, `${slugStr}.mdx`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const { data, content } = matter(raw);
    return {
      title: (data.title as string) || slugStr,
      description: (data.description as string) || "",
      content,
      slugStr,
    };
  } catch {
    return null;
  }
}

export default async function DocsPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const doc = await loadDoc(slug);
  if (!doc) notFound();

  const activeSlug = doc.slugStr;
  const allLinear = NAV.flatMap((s) => s.pages);
  const idx = allLinear.findIndex((p) => p.slug === activeSlug);
  const prev = idx > 0 ? allLinear[idx - 1] : null;
  const next = idx < allLinear.length - 1 ? allLinear[idx + 1] : null;

  // Find which group this slug belongs to (for the eyebrow)
  const activeGroup = NAV.find((s) => s.pages.some((p) => p.slug === activeSlug))?.group ?? "Docs";

  return (
    <Shell active="/docs">
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-12 md:grid-cols-[240px_1fr] md:px-8 md:py-20">
          {/* Left nav */}
          <aside className="hidden md:block">
            <div className="sticky top-20">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-accent)]">
                Documentation
              </p>
              <nav className="mt-6 space-y-7">
                {NAV.map((section) => (
                  <div key={section.group}>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                      {section.group}
                    </p>
                    <ul className="mt-2.5 space-y-0.5">
                      {section.pages.map((p) => {
                        const isActive = p.slug === activeSlug;
                        return (
                          <li key={p.slug}>
                            <Link
                              href={`/docs/${p.slug}`}
                              className={`block rounded-md border-l-2 px-2.5 py-1.5 text-[13px] transition-colors ${
                                isActive
                                  ? "border-[var(--ds-accent)] bg-[var(--ds-bg-elev)] text-[var(--ds-accent)]"
                                  : "border-transparent text-[var(--ds-text-mute)] hover:border-[var(--ds-border)] hover:bg-[var(--ds-bg-elev)] hover:text-[var(--ds-text)]"
                              }`}
                            >
                              {p.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content — 720-820px reading column */}
          <article className="min-w-0 max-w-[780px]">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-accent)]">
              {activeGroup}
            </p>
            <h1 className="mt-3 text-[36px] font-bold leading-[1.05] tracking-[-0.025em] text-[var(--ds-text)] md:text-[48px]">
              {doc.title}
            </h1>
            {doc.description && (
              <p className="mt-4 text-[17px] leading-[1.55] text-[var(--ds-text-mute)] md:text-[19px]">
                {doc.description}
              </p>
            )}

            <div className="docs-prose mt-10">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({ children, ...p }) => (
                    <div className="mt-12 mb-4">
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-accent)]">
                        Section
                      </p>
                      <h2 className="mt-2 text-[24px] font-bold leading-tight tracking-tight text-[var(--ds-text)] md:text-[28px]" {...p}>
                        {children}
                      </h2>
                    </div>
                  ),
                  h3: ({ ...p }) => (
                    <h3 className="mt-8 text-[18px] font-semibold leading-tight text-[var(--ds-text)] md:text-[20px]" {...p} />
                  ),
                  p: ({ ...p }) => (
                    <p className="mt-5 text-[15.5px] leading-[1.65] text-[var(--ds-text-mute)]" {...p} />
                  ),
                  strong: ({ ...p }) => (
                    <strong className="font-semibold text-[var(--ds-text)]" {...p} />
                  ),
                  ul: ({ ...p }) => (
                    <ul className="docs-ul mt-5 space-y-2 pl-5 text-[15.5px] leading-[1.65] text-[var(--ds-text-mute)]" {...p} />
                  ),
                  ol: ({ ...p }) => (
                    <ol className="mt-5 list-decimal space-y-2 pl-6 text-[15.5px] leading-[1.65] text-[var(--ds-text-mute)] marker:text-[var(--ds-text-dim)]" {...p} />
                  ),
                  li: ({ ...p }) => (
                    <li className="pl-1" {...p} />
                  ),
                  a: ({ ...p }) => (
                    <a className="text-[var(--ds-accent)] underline underline-offset-2 hover:text-[var(--ds-text)]" {...p} />
                  ),
                  hr: () => (
                    <hr className="my-10 border-t border-[var(--ds-border)]" />
                  ),
                  code: ({ children, ...p }) => (
                    <code className="rounded bg-[var(--ds-bg-elev)] px-1.5 py-0.5 font-mono text-[13px] text-[var(--ds-text)]" {...p}>
                      {children}
                    </code>
                  ),
                  pre: ({ children, ...p }) => (
                    <pre className="mt-5 overflow-x-auto rounded-md border border-[var(--ds-border)] border-l-2 border-l-[var(--ds-accent)] bg-[var(--ds-bg-deep)] p-4 font-mono text-[13px] leading-relaxed text-[var(--ds-text)]" {...p}>
                      {children}
                    </pre>
                  ),
                  blockquote: ({ ...p }) => (
                    <blockquote className="mt-5 rounded-md border-l-2 border-[var(--ds-accent)] bg-[var(--ds-bg-elev)] px-5 py-3 text-[15px] italic text-[var(--ds-text-mute)]" {...p} />
                  ),
                  table: ({ ...p }) => (
                    <div className="mt-6 overflow-x-auto rounded-md border border-[var(--ds-border)]">
                      <table className="w-full border-collapse text-[14px]" {...p} />
                    </div>
                  ),
                  th: ({ ...p }) => (
                    <th className="border-b border-[var(--ds-border)] bg-[var(--ds-bg-elev)] px-3 py-2 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--ds-text)]" {...p} />
                  ),
                  td: ({ ...p }) => (
                    <td className="border-b border-[var(--ds-border)] px-3 py-2 text-[var(--ds-text-mute)]" {...p} />
                  ),
                }}
              >
                {doc.content}
              </ReactMarkdown>
            </div>

            {/* Prev/Next nav */}
            <nav className="mt-16 grid gap-3 border-t border-[var(--ds-border)] pt-8 md:grid-cols-2">
              {prev ? (
                <Link
                  href={`/docs/${prev.slug}`}
                  className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5 transition-colors hover:border-[var(--ds-accent)]/40"
                >
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                    ← Previous
                  </p>
                  <p className="mt-1 text-[15px] font-semibold text-[var(--ds-text)]">{prev.label}</p>
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link
                  href={`/docs/${next.slug}`}
                  className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5 text-right transition-colors hover:border-[var(--ds-accent)]/40"
                >
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                    Next →
                  </p>
                  <p className="mt-1 text-[15px] font-semibold text-[var(--ds-text)]">{next.label}</p>
                </Link>
              )}
            </nav>
          </article>
        </div>
      </section>
    </Shell>
  );
}
