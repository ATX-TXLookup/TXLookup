# TXLookup docs site

Mintlify-powered documentation for the TXLookup MCP server and agent skill.

## Local preview

```bash
npx --yes mintlify@latest dev --port 8721
```

Open [http://localhost:8721](http://localhost:8721). Hot-reloads on save.

## Structure

```
docs-site/
├── mint.json                # Mintlify config (nav, colors, tabs)
├── introduction.mdx         # Tab: Get Started
├── quickstart.mdx
├── mcp/
│   ├── install.mdx          # Tab: MCP Server
│   └── tools.mdx
├── skill/
│   ├── install.mdx          # Tab: Agent Skill
│   └── safety.mdx
└── agent/
    ├── architecture.mdx     # Tab: Architecture
    └── datasets.mdx
```

## Deploy

This project auto-deploys via the [Mintlify GitHub app](https://mintlify.com/docs/quickstart#step-3-publish-your-changes). Connect the repo at https://dashboard.mintlify.com, point it at `docs-site/`, and every push to `main` ships to the configured subdomain.

For Vercel-hosted custom domains, add a rewrite from `/docs/*` to the Mintlify-hosted URL in `vercel.json`.

## Lint the config

```bash
python3 -m json.tool docs-site/mint.json
```

## Notes

- Logo paths in `mint.json` (`/logo/light.svg`, `/logo/dark.svg`) are placeholders — drop the real assets at `docs-site/logo/` before publishing.
- Versions: `v0.1-alpha`. Bump in `mint.json` `versions[]` when cutting a release.
- Do **not** move or rename anything in the existing `docs/` folder — that's the engineering-doc directory; this is the public docs site.
