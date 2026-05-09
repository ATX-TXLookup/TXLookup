/**
 * Basic-auth gate so the site isn't public during development.
 *
 * Set TXLOOKUP_BASIC_AUTH="user:password" in env to enable.
 * If unset, the gate is a no-op (open access).
 *
 * Bypassed:
 * - /api/*    — agent endpoint must remain accessible programmatically
 * - /_next/*  — Next.js assets
 * - /favicon* / robots / sitemap — standard
 */
import { NextRequest, NextResponse } from "next/server";

const REALM = 'Basic realm="TXLookup", charset="UTF-8"';

export function middleware(req: NextRequest) {
  const expected = process.env.TXLOOKUP_BASIC_AUTH;
  if (!expected) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
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
  matcher: ["/((?!api|_next|favicon.ico|robots.txt|sitemap.xml).*)"],
};
