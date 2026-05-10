// TXLookup agent observatory page (/q). Wrapped in the shared Shell chrome
// (header + footer) for consistency with the rest of the site. The body
// remains the AgentRunner — left answer column + right observatory column.

import { Shell } from "@/app/components/ds";

import { AgentRunner } from "./AgentRunner";

export default async function QueryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; dataset?: string }>;
}) {
  const { q, dataset } = await searchParams;
  const query = q?.trim() || "";

  return (
    <Shell active="/q">
      <AgentRunner query={query} dataset={dataset} />
    </Shell>
  );
}
