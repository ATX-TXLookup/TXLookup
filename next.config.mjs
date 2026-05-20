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
};

export default nextConfig;
