import Link from "next/link";
import type { SearchConfigSummary } from "@/api-client/types";
import { STATUS_LABEL } from "@/components/search/run-labels";
import { searchUrl } from "@/components/search/select-search";
import { RunTally, TierBar, totalLeads } from "@/components/search/TierBar";
import { RelativeTime } from "@/components/ui/RelativeTime";
import styles from "./configs.module.css";

export function LastRunCell({ config }: { config: SearchConfigSummary }) {
  const run = config.lastRun;
  if (!run) {
    return (
      <dl className={styles.lastRun}>
        <dt className={styles.lastRunHead}>Last run</dt>
        <dd className={styles.never}>
          <span className={styles.dash} aria-hidden="true" />
          <span className="visually-hidden">Never run</span>
        </dd>
      </dl>
    );
  }

  const total = totalLeads(run.tierCounts);
  return (
    <dl className={styles.lastRun}>
      <dt className={styles.lastRunHead}>
        Last run <RelativeTime iso={run.startedAt} />
      </dt>
      {run.status !== "completed" ? (
        <dd className={styles.lastRunStatus}>
          <span className="badge" data-tone={run.status}>
            {STATUS_LABEL[run.status]}
          </span>
        </dd>
      ) : null}
      <dd className={styles.lastRunBody}>
        {total > 0 && run.status !== "running" ? (
          <Link href={searchUrl(config.id, run.id)} className={styles.barLink}>
            <span className={styles.total}>
              <span className="mono">{total}</span> {total === 1 ? "lead" : "leads"}
              <span className="visually-hidden">, open this run</span>
            </span>
            <TierBar counts={run.tierCounts} />
          </Link>
        ) : (
          <RunTally status={run.status} tierCounts={run.tierCounts} />
        )}
      </dd>
    </dl>
  );
}
