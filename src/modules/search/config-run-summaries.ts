import { db } from "@/lib/db";
import { failOrphanedRuns } from "./active-runs";
import { noLeads, tierCountsByRun } from "./run-tier-counts";
import { asRunStatus, type SearchRun } from "./search-run-repository";

export type LastRun = Pick<SearchRun, "id" | "status" | "startedAt" | "finishedAt" | "tierCounts">;

export interface ConfigRunSummary {
  lastRun: LastRun | null;
  runCount: number;
}

export async function runSummariesByConfig(
  configIds: readonly string[],
): Promise<Map<string, ConfigRunSummary>> {
  await failOrphanedRuns();
  const ofConfigs = { configId: { in: [...configIds] } };
  const totals = await db.searchRun.groupBy({
    by: ["configId"],
    where: ofConfigs,
    _count: { _all: true },
    _max: { startedAt: true },
  });
  const runCounts = new Map(totals.map((total) => [total.configId, total._count._all]));
  const candidates = await db.searchRun.findMany({
    where: { ...ofConfigs, startedAt: { in: totals.flatMap((total) => total._max.startedAt ?? []) } },
    select: { id: true, configId: true, status: true, startedAt: true, finishedAt: true },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
  });
  const latest = new Map<string, (typeof candidates)[number]>();
  for (const run of candidates) {
    if (run.configId !== null && !latest.has(run.configId)) latest.set(run.configId, run);
  }
  const tierCounts = await tierCountsByRun([...latest.values()].map((run) => run.id));

  const summaries = new Map<string, ConfigRunSummary>();
  for (const configId of configIds) {
    const run = latest.get(configId);
    const lastRun = run && {
      id: run.id,
      status: asRunStatus(run.status),
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      tierCounts: tierCounts.get(run.id) ?? noLeads(),
    };
    summaries.set(configId, { lastRun: lastRun ?? null, runCount: runCounts.get(configId) ?? 0 });
  }
  return summaries;
}
