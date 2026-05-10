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

  return (
    <Shell active="/docs">
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-6 py-12 md:grid-cols-[240px_1fr] md:px-8 md:py-16">
          {/* Left nav */}
          <aside className="hidden md:block">
            <div className="sticky top-20">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-text-dim)]">
                Documentation
              </p>
              <nav className="mt-6 space-y-6">
                {NAV.map((section) => (
                  <div key={section.group}>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                      {section.group}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {section.pages.map((p) => {
                        const isActive = p.slug === activeSlug;
                        return (
                          <li key={p.slug}>
                            <Link
                              href={`/docs/${p.slug}`}
                              className={`block rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
                                isActive
                                  ? "bg-[var(--ds-bg-elev)] text-[var(--ds-text)]"
                                  : "text-[var(--ds-text-mute)] hover:bg-[var(--ds-bg-elev)] hover:text-[var(--ds-text)]"
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

          {/* Content */}
          <article className="min-w-0 max-w-[760px]">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-accent)]">
              TXLookup Docs
            </p>
            <h1 className="mt-3 text-[36px] font-bold leading-[1.1] tracking-[-0.025em] text-[var(--ds-text)] md:text-[48px]">
              {doc.title}
            </h1>
            {doc.description && (
              <p className="mt-4 text-[18px] leading-[1.55] text-[var(--ds-text-mute)] md:text-[20px]">
                {doc.description}
              </p>
            )}

            <div className="docs-prose mt-10">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({ ...p }) => (
                    <h2 className="mt-12 text-[26px] font-bold leading-tight tracking-tight text-[var(--ds-text)] md:text-[32px]" {...p} />
                  ),
                  h3: ({ ...p }) => (
                    <h3 className="mt-9 text-[20px] font-bold leading-tight text-[var(--ds-text)] md:text-[22px]" {...p} />
                  ),
                  p: ({ ...p }) => (
                    <p className="mt-5 text-[16px] leading-[1.7] text-[var(--ds-text-mute)] md:text-[17px]" {...p} />
                  ),
                  ul: ({ ...p }) => (
                    <ul className="mt-5 space-y-2 pl-6 text-[16px] leading-[1.7] text-[var(--ds-text-mute)] [&>li]:list-disc md:text-[17px]" {...p} />
                  ),
                  ol: ({ ...p }) => (
                    <ol className="mt-5 space-y-2 pl-6 text-[16px] leading-[1.7] text-[var(--ds-text-mute)] [&>li]:list-decimal md:text-[17px]" {...p} />
                  ),
                  a: ({ ...p }) => (
                    <a className="text-[var(--ds-accent)] underline underline-offset-2 hover:text-[var(--ds-text)]" {...p} />
                  ),
                  code: ({ children, ...p }) => (
                    <code className="rounded-sm bg-[var(--ds-bg-elev)] px-1.5 py-0.5 font-mono text-[13px] text-[var(--ds-text)]" {...p}>
                      {children}
                    </code>
                  ),
                  pre: ({ children, ...p }) => (
                    <pre className="mt-5 overflow-x-auto rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-deep)] p-4 font-mono text-[13px] leading-relaxed text-[var(--ds-text)]" {...p}>
                      {children}
                    </pre>
                  ),
                  blockquote: ({ ...p }) => (
                    <blockquote className="mt-5 border-l-2 border-[var(--ds-accent)] bg-[var(--ds-bg-elev)] px-5 py-3 text-[15px] italic text-[var(--ds-text-mute)]" {...p} />
                  ),
                  table: ({ ...p }) => (
                    <div className="mt-5 overflow-x-auto">
                      <table className="w-full border-collapse text-[14px]" {...p} />
                    </div>
                  ),
                  th: ({ ...p }) => (
                    <th className="border-b border-[var(--ds-border)] px-3 py-2 text-left font-semibold text-[var(--ds-text)]" {...p} />
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
                  className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-4 transition-colors hover:border-[var(--ds-accent)]/40"
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
                  className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-4 text-right transition-colors hover:border-[var(--ds-accent)]/40"
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
