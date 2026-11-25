/**
 * Basic-auth gate so the site isn't public during development.
 *
 * Set TXLOOKUP_BASIC_AUTH="user:password" in env to enable.
 * If unset, the gate is a no-op (open access).
 *
 * Gated:
 * - everything by default (when TXLOOKUP_BASIC_AUTH is set)
 * - /admin/*       — admin console
 * - /api/admin/*   — admin API (run archive list/mark)
 *
 * Bypassed:
 * - /api/agent    — programmatic agent endpoint (called from /admin form posts;
 *                   the browser already authenticated for the page itself)
 * - other /api/*  — public/programmatic endpoints
 * - /_next/*      — Next.js assets
 * - /favicon* / robots / sitemap — standard
 */
import { NextRequest, NextResponse } from "next/server";

const REALM = 'Basic realm="TXLookup", charset="UTF-8"';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accept = req.headers.get("accept") || "";

  // Markdown for Agents: serve clean Markdown on public home when Accept: text/markdown is sent.
  const expected = process.env.TXLOOKUP_BASIC_AUTH;
  if (!expected) {
    if (pathname === "/" && /text\/markdown/i.test(accept)) {
      const url = req.nextUrl.clone();
      url.pathname = "/ai/index.md";
      const res = NextResponse.rewrite(url);
      res.headers.set("Vary", "Accept");
      return res;
    }
    return NextResponse.next();
  }

  const isAdminApi = pathname.startsWith("/api/admin/") || pathname === "/api/admin";
  if (
    !isAdminApi &&
    (pathname.startsWith("/api/") ||
      pathname.startsWith("/_next/") ||
      pathname === "/favicon.ico" ||
      pathname === "/robots.txt" ||
      pathname === "/sitemap.xml" ||
      pathname === "/llms.txt" ||
      pathname === "/.well-known/api-catalog")
  ) {
    return NextResponse.next();
  }

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    if (decoded === expected) return NextResponse.next();
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": REALM },
  });
}

export const config = {
  // Match everything except Next.js internals and static assets — admin paths
  // (both /admin/* and /api/admin/*) need to flow through this middleware.
  matcher: ["/((?!_next|favicon.ico|robots.txt|sitemap.xml).*)"],
};
