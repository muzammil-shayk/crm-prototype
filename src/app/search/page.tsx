import type { Metadata } from "next";
import { connection } from "next/server";
import { toJson } from "@/api-client/to-json";
import { LiveSearch } from "@/components/search/LiveSearch";
import { selectSearch } from "@/components/search/select-search";
import { listConfigs } from "@/modules/configs/config-service";
import { getSearchRun, listSearchRuns } from "@/modules/search/search-service";
import { orUndefined, publicSearchTypes } from "../server-data";

export const metadata: Metadata = { title: "Live search" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const single = (value: string | string[] | undefined) => (typeof value === "string" ? value : null);

export default async function LiveSearchPage({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const query = await searchParams;
  const wanted = { configId: single(query.config), runId: single(query.run) };
  const stored = await orUndefined(listConfigs());
  const configs = stored && toJson(stored);
  const { config, runId } = selectSearch(configs ?? [], wanted);
  const [runs, snapshot] = await Promise.all([
    config ? orUndefined(listSearchRuns({ configId: config.id })) : undefined,
    runId ? orUndefined(getSearchRun(runId)) : undefined,
  ]);

  return (
    <LiveSearch
      key={`${wanted.configId ?? ""}:${wanted.runId ?? ""}`}
      initialConfigId={wanted.configId}
      initialRunId={wanted.runId}
      initialConfigs={configs}
      initialTypes={publicSearchTypes()}
      initialRuns={config && runs ? { configId: config.id, runs: toJson(runs) } : undefined}
      initialSnapshot={snapshot && toJson(snapshot)}
    />
  );
}
