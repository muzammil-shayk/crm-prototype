import Link from "next/link";
import type { RunStats, SearchRun } from "@/api-client/types";
import { plural } from "@/components/format";
import { Notice } from "@/components/ui/states";
import { LIMIT_EXPLANATION } from "./run-labels";
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

type StatRow = [keyof RunStats, string, "always" | "when-any"];

const STAT_ROWS: StatRow[] = [
  ["retrieved", "Posts fetched", "always"],
  ["duplicates", "Duplicates removed", "always"],
  ["excluded", "Excluded by keyword", "always"],
  ["outsideLocation", "Outside your locations", "when-any"],
  ["outsideIndustry", "Outside your industries", "when-any"],
  ["evaluated", "Leads scored", "always"],
  ["queries", "Queries run", "always"],
  ["costUnits", "Provider calls", "always"],
];

const FILTERS: [keyof RunStats, string][] = [
  ["excluded", "Your excluded keywords"],
  ["outsideLocation", "Your location filter"],
  ["outsideIndustry", "Your industry filter"],
];

export function biggestFilter(stats: RunStats): { name: string; removed: number } | null {
  let biggest: { name: string; removed: number } | null = null;
  for (const [key, name] of FILTERS) {
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

export function RunStatsList({ stats }: { stats: RunStats }) {
  const shown = STAT_ROWS.filter(([key, , rule]) => rule === "always" || stats[key] > 0);
  return (
    <dl className={styles.stats}>
      {shown.map(([key, label]) => (
        <div key={key} className={styles.stat}>
          <dt>{label}</dt>
          <dd className="mono">{stats[key]}</dd>
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

export function RunOutcome({ run, leadCount }: { run: SearchRun; leadCount: number }) {
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
      {run.status !== "cancelled" ? <RunStatsList stats={run.stats} /> : null}
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
