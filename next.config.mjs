/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // better-sqlite3 ships native bindings (.node files) — Next must NOT try to
  // bundle it through webpack. Marking it external keeps it as a regular
  // node_modules require, which Vercel respects.
  serverExternalPackages: ["better-sqlite3"],
  // Ship the local SQLite mirror to every serverless function bundle so the
  // cache layer in app/lib/cache.ts can read it on Vercel. Without this, the
  // 5 MB data/cache.db is dropped during the build and every page falls
  // through to live Socrata — defeating the purpose of the local mirror.
  outputFileTracingIncludes: {
    "/": ["./data/cache.db"],
    "/datasets/**": ["./data/cache.db"],
    "/api/**": ["./data/cache.db"],
    "/reports/**": ["./data/cache.db"],
  },
};

export default nextConfig;
