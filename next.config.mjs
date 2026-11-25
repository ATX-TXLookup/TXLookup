/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Bundle the local JSON mirror into every serverless function. The cache
  // reader (app/lib/cache.ts) does fs.readFile against data/cache/<id>.json
  // — without this, the files are dropped during the Next build and every
  // page falls through to live Socrata.
  outputFileTracingIncludes: {
    "/": ["./data/cache/**", "./data/catalog/**", "./data/runs/**"],
    "/q/**": ["./data/cache/**", "./data/catalog/**", "./data/runs/**"],
    "/datasets/**": ["./data/cache/**", "./data/catalog/**"],
    "/api/**": ["./data/cache/**", "./data/catalog/**", "./data/runs/**"],
    "/reports/**": ["./data/cache/**", "./data/catalog/**"],
    "/chat": ["./data/catalog/**"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Vary", value: "Accept" },
          {
            key: "Link",
            value:
              '</llms.txt>; rel="describedby"; type="text/markdown", </.well-known/api-catalog>; rel="api-catalog"',
          },
        ],
      },
      {
        source: "/llms.txt",
        headers: [{ key: "Content-Type", value: "text/markdown; charset=utf-8" }],
      },
      {
        source: "/ai/:path*.md",
        headers: [{ key: "Content-Type", value: "text/markdown; charset=utf-8" }],
      },
      {
        source: "/.well-known/api-catalog",
        headers: [{ key: "Content-Type", value: "application/linkset+json; charset=utf-8" }],
      },
    ];
  },
};

export default nextConfig;
