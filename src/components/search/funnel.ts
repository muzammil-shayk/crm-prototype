import type { RunStage, RunStats, RunStatus, Tier } from "@/api-client/types";
import { TIERS } from "@/lib/tiers";
import { STAGES } from "./run-labels";
import type { TierCounts } from "./TierBar";

export interface Shed {
  count: number;
  label: string;
}

export interface FunnelStep {
  key: "fetched" | "unique" | "kept" | "inFilters" | "scored";
  label: string;
  count: number | null;
  shed: Shed[];
  queued: number;
}

export interface Funnel {
  queries: number | null;
  calls: number | null;
  scale: number;
  steps: FunnelStep[];
  tiers: { tier: Tier; count: number }[] | null;
  stoppedAt: FunnelStep["key"] | null;
}

const stageIndex = (stage: RunStage) => STAGES.findIndex(({ id }) => id === stage);

function outsideShed(stats: RunStats): Shed[] {
  if (stats.outsideFilters > stats.outsideLocation + stats.outsideIndustry || stats.outsideFilters === 0) {
    return [{ count: stats.outsideFilters, label: "outside your filters" }];
  }
  return [
    { count: stats.outsideLocation, label: "outside your locations" },
    { count: stats.outsideIndustry, label: "outside your industries" },
  ].filter((shed) => shed.count > 0);
}

export function runFunnel(
  stats: RunStats,
  run: { status: RunStatus; stage: RunStage; tierCounts: TierCounts },
): Funnel {
  const live = run.status === "running" || run.status === "cancelled";
  const reached = live ? stageIndex(run.stage) : STAGES.length;
  const knows = (stage: RunStage) => reached >= stageIndex(stage);
  const unique = Math.max(stats.retrieved - stats.duplicates, 0);
  const kept = Math.max(unique - stats.excluded, 0);
  const inFilters = Math.max(kept - stats.outsideFilters, 0);
  const sorted = knows("evaluating");
  const unscored = Math.max(inFilters - stats.evaluated, 0);

  const steps: FunnelStep[] = [
    {
      key: "fetched",
      label: "Fetched",
      count: knows("filtering") ? stats.retrieved : null,
      shed: [],
      queued: 0,
    },
    {
      key: "unique",
      label: "Unique",
      count: sorted ? unique : null,
      shed: [{ count: stats.duplicates, label: "duplicates" }],
      queued: 0,
    },
    {
      key: "kept",
      label: "No excluded words",
      count: sorted ? kept : null,
      shed: [{ count: stats.excluded, label: "excluded by keyword" }],
      queued: 0,
    },
    {
      key: "inFilters",
      label: "Inside filters",
      count: sorted ? inFilters : null,
      shed: outsideShed(stats),
      queued: 0,
    },
    {
      key: "scored",
      label: "Scored",
      count: sorted ? stats.evaluated : null,
      shed:
        run.status === "running" || unscored === 0
          ? []
          : [
              {
                count: unscored,
                label: run.status === "cancelled" ? "not scored, cancelled" : "not scored, run limit",
              },
            ],
      queued: run.status === "running" && sorted ? unscored : 0,
    },
  ];

  const leads = TIERS.reduce((sum, tier) => sum + run.tierCounts[tier], 0);
  const stopped = run.status === "cancelled" ? steps.find((step) => step.count === null) : undefined;

  return {
    queries: knows("retrieving") ? stats.queries : null,
    calls: knows("retrieving") ? stats.costUnits : null,
    scale: Math.max(stats.retrieved, 1),
    steps,
    tiers:
      run.status !== "running" && leads > 0
        ? TIERS.map((tier) => ({ tier, count: run.tierCounts[tier] }))
        : null,
    stoppedAt: stopped?.key ?? null,
  };
}

export const share = (count: number | null, scale: number) =>
  count === null ? 0 : Math.min(Math.max(count / scale, 0), 1);
