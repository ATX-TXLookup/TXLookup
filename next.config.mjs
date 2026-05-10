/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Bundle the local JSON mirror into every serverless function. The cache
  // reader (app/lib/cache.ts) does fs.readFile against data/cache/<id>.json
  // — without this, the files are dropped during the Next build and every
  // page falls through to live Socrata.
  outputFileTracingIncludes: {
    "/": ["./data/cache/**"],
    "/datasets/**": ["./data/cache/**"],
    "/api/**": ["./data/cache/**"],
    "/reports/**": ["./data/cache/**"],
  },
};

export default nextConfig;
