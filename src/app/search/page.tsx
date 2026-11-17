import type { Metadata } from "next";
import { LiveSearch } from "@/components/search/LiveSearch";

export const metadata: Metadata = { title: "Live search" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const single = (value: string | string[] | undefined) => (typeof value === "string" ? value : null);

export default async function LiveSearchPage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const configId = single(query.config);
  const runId = single(query.run);
  return (
    <LiveSearch key={`${configId ?? ""}:${runId ?? ""}`} initialConfigId={configId} initialRunId={runId} />
  );
}
