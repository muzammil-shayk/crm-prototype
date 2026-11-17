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
      return { tone: "info" as const, title: "You cancelled this search. Cancelled runs keep no leads." };
    case "running":
      return { tone: "info" as const, title: "Still running." };
  }
}

const STAT_LABELS: [keyof RunStats, string][] = [
  ["queries", "Queries run"],
  ["retrieved", "Posts fetched"],
  ["duplicates", "Duplicates removed"],
  ["excluded", "Excluded by keyword"],
  ["evaluated", "Leads scored"],
  ["costUnits", "Provider calls"],
];

export function RunStatsList({ stats }: { stats: RunStats }) {
  return (
    <dl className={styles.stats}>
      {STAT_LABELS.map(([key, label]) => (
        <div key={key} className={styles.stat}>
          <dt>{label}</dt>
          <dd className="mono">{stats[key]}</dd>
        </div>
      ))}
    </dl>
  );
}

export function RunOutcome({ run, leadCount }: { run: SearchRun; leadCount: number }) {
  const { tone, title } = summary(run, leadCount);
  const failures = run.stats.queryFailures + run.stats.evaluationFailures;
  const explanations = [
    ...run.limitsHit.map((limit) => LIMIT_EXPLANATION[limit]),
    ...(failures > 0 ? [`${plural(failures, "provider call")} failed after retries. Details below.`] : []),
  ];

  return (
    <div className={styles.outcome}>
      <Notice tone={tone} title={title}>
        {run.error ? <p>{run.error}</p> : null}
        {run.status === "completed" && leadCount === 0 ? (
          <p>Try broader keywords or fewer exclusions, then run it again.</p>
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
