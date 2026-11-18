import Link from "next/link";
import type { CSSProperties } from "react";
import type { RunStage, RunStats, SearchRun } from "@/api-client/types";
import { plural } from "@/components/format";
import { CountUp } from "@/components/ui/CountUp";
import { Notice } from "@/components/ui/states";
import { LIMIT_EXPLANATION, STAGES } from "./run-labels";
import styles from "./search.module.css";

function summary(run: SearchRun, leadCount: number) {
  switch (run.status) {
    case "completed":
      return leadCount > 0
        ? { tone: "success" as const, title: `Finished with ${plural(leadCount, "lead")}.` }
        : { tone: "info" as const, title: "Finished, but no posts matched this config." };
    case "partial":
      return { tone: "warning" as const, title: `Finished with gaps. ${plural(leadCount, "lead")} saved.` };
    case "failed":
      return { tone: "error" as const, title: "This search failed." };
    case "cancelled":
      return {
        tone: "info" as const,
        title:
          leadCount > 0
            ? `Cancelled. Kept ${plural(leadCount, "lead")} that ${leadCount === 1 ? "was" : "were"} scored before you stopped.`
            : "Cancelled before any lead was scored.",
      };
    case "running":
      return { tone: "info" as const, title: "Still running." };
  }
}

type StatRow = [keyof RunStats, string, "always" | "when-any" | "combined", RunStage];

const STAT_ROWS: StatRow[] = [
  ["queries", "Queries run", "always", "retrieving"],
  ["retrieved", "Posts fetched", "always", "filtering"],
  ["duplicates", "Duplicates removed", "always", "evaluating"],
  ["excluded", "Excluded by keyword", "always", "evaluating"],
  ["outsideFilters", "Outside your filters", "combined", "evaluating"],
  ["outsideLocation", "Outside your locations", "when-any", "evaluating"],
  ["outsideIndustry", "Outside your industries", "when-any", "evaluating"],
  ["evaluated", "Leads scored", "always", "evaluating"],
  ["costUnits", "Provider calls", "always", "retrieving"],
];

type Filter = [keyof RunStats, string];

const BY_KEYWORD: Filter = ["excluded", "Your excluded keywords"];

const FILTERS: Filter[] = [
  BY_KEYWORD,
  ["outsideLocation", "Your location filter"],
  ["outsideIndustry", "Your industry filter"],
];

const COMBINED_FILTERS: Filter[] = [BY_KEYWORD, ["outsideFilters", "Your location and industry filters"]];

const onlyCombinedCount = (stats: RunStats) =>
  stats.outsideFilters > stats.outsideLocation + stats.outsideIndustry;

export function biggestFilter(stats: RunStats): { name: string; removed: number } | null {
  let biggest: { name: string; removed: number } | null = null;
  for (const [key, name] of onlyCombinedCount(stats) ? COMBINED_FILTERS : FILTERS) {
    if (stats[key] > (biggest?.removed ?? 0)) biggest = { name, removed: stats[key] };
  }
  return biggest;
}

export function noMatchAdvice(stats: RunStats): string {
  if (stats.retrieved === 0)
    return "No posts came back for these keywords. Try broader keywords, then run it again.";
  const filter = biggestFilter(stats);
  if (!filter) return "Try broader keywords or fewer exclusions, then run it again.";
  return `${filter.name} removed the most: ${filter.removed} of ${plural(stats.retrieved, "post")} fetched. Loosen it or try broader keywords, then run it again.`;
}

export const TRACE_STEP_MS = 110;

const stageIndex = (stage: RunStage) => STAGES.findIndex(({ id }) => id === stage);

export function statRows(
  stats: RunStats,
  reached?: RunStage,
): { key: keyof RunStats; label: string; value: number | null }[] {
  const combined = onlyCombinedCount(stats);
  return STAT_ROWS.filter(
    ([key, , rule]) => rule === "always" || (rule === "combined" ? combined : !combined && stats[key] > 0),
  ).map(([key, label, , knownFrom]) => ({
    key,
    label,
    value: reached && stageIndex(reached) < stageIndex(knownFrom) ? null : stats[key],
  }));
}

interface RunStatsListProps {
  stats: RunStats;
  replay?: boolean;
  live?: boolean;
  reached?: RunStage;
}

export function RunStatsList({ stats, replay = false, live = false, reached }: RunStatsListProps) {
  return (
    <dl className={styles.stats} data-replay={replay || undefined} data-live={live || undefined}>
      {statRows(stats, reached).map(({ key, label, value }, index) => (
        <div
          key={key}
          className={styles.stat}
          data-state={value === null ? "pending" : "known"}
          style={{ "--step": index } as CSSProperties}
        >
          <dt>{label}</dt>
          <dd className="mono">
            {value === null ? (
              <>
                <span aria-hidden="true">–</span>
                <span className="visually-hidden">{live ? "Not counted yet" : "Not reached"}</span>
              </>
            ) : (
              <CountUp
                value={value}
                play={replay}
                follow={live}
                delayMs={replay ? index * TRACE_STEP_MS : 0}
              />
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function runExplanations(run: SearchRun): string[] {
  const failures = run.stats.queryFailures + run.stats.evaluationFailures;
  const pointer = run.warnings.length > 0 ? " Details below." : "";
  return [
    ...run.limitsHit.map((limit) => LIMIT_EXPLANATION[limit]),
    ...(failures > 0 ? [`${plural(failures, "provider call")} failed after retries.${pointer}`] : []),
  ];
}

function EditConfigLink({ configId }: { configId: string | null }) {
  return configId ? (
    <Link href={`/configs/${configId}/edit`} className={styles.inlineEdit}>
      Edit this config
    </Link>
  ) : null;
}

interface RunOutcomeProps {
  run: SearchRun;
  leadCount: number;
  replay?: boolean;
}

export function RunOutcome({ run, leadCount, replay = false }: RunOutcomeProps) {
  const { tone, title } = summary(run, leadCount);
  const explanations = runExplanations(run);
  const noMatch = run.status === "completed" && leadCount === 0;
  const filter = run.status === "cancelled" ? null : biggestFilter(run.stats);

  return (
    <div className={styles.outcome}>
      <Notice tone={tone} title={title}>
        {run.error ? <p>{run.error}</p> : null}
        {noMatch ? (
          <p>
            {noMatchAdvice(run.stats)} <EditConfigLink configId={run.configId} />
          </p>
        ) : null}
        {explanations.length > 0 ? (
          <ul className={styles.explanations}>
            {explanations.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        ) : null}
      </Notice>
      {run.status !== "cancelled" ? (
        <RunStatsList stats={run.stats} replay={replay} />
      ) : run.stats.queries > 0 ? (
        <RunStatsList stats={run.stats} reached={run.stage} />
      ) : null}
      {filter && !noMatch ? (
        <p className={styles.funnelNote}>
          {filter.name} removed the most posts ({filter.removed}). <EditConfigLink configId={run.configId} />
        </p>
      ) : null}
      {run.warnings.length > 0 ? (
        <details className={styles.warnings} open={run.warnings.length <= 3}>
          <summary>{plural(run.warnings.length, "warning")} from this run</summary>
          <ul>
            {run.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
