import { redirect } from "next/navigation";
import { findRunBySlug } from "@/app/lib/run-archive";

export const dynamic = "force-dynamic";

export default async function AnswersSlugAlias({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const run = await findRunBySlug(slug);
  if (!run) redirect("/q");
  redirect(`/q?q=${encodeURIComponent(run.query)}`);
}
