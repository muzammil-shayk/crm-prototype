"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api-client/api";
import type { SearchRun } from "@/api-client/types";
import { useResource } from "@/api-client/use-resource";
import { formatDateTime, plural } from "@/components/format";
import { ErrorState, LoadingRows } from "@/components/ui/states";
import { STATUS_LABEL } from "./run-labels";
import styles from "./search.module.css";

interface RunHistoryProps {
  configId: string;
  currentRun: SearchRun | null;
  selectedRunId: string | null;
  onSelect: (runId: string) => void;
}

export function mergeRun(runs: readonly SearchRun[], current: SearchRun | null): SearchRun[] {
  if (!current) return [...runs];
  const known = runs.some((run) => run.id === current.id);
  return known ? runs.map((run) => (run.id === current.id ? current : run)) : [current, ...runs];
}

export const RUNS_PER_PAGE = 10;

export function shownRunCount(total: number, limit: number, selectedIndex: number): number {
  return Math.min(total, Math.max(limit, selectedIndex + 1));
}

export function RunHistory({ configId, currentRun, selectedRunId, onSelect }: RunHistoryProps) {
  const load = useCallback(() => api.searches.list(configId), [configId]);
  const { resource, reload } = useResource(load);

  const belongsHere = currentRun?.configId === configId ? currentRun : null;
  const runs = resource.status === "ready" ? mergeRun(resource.data, belongsHere) : [];
  const [limit, setLimit] = useState(RUNS_PER_PAGE);
  const shown = shownRunCount(
    runs.length,
    limit,
    runs.findIndex((run) => run.id === selectedRunId),
  );
  const listRef = useRef<HTMLUListElement>(null);
  const firstRevealed = useRef<number | null>(null);

  useEffect(() => {
    const index = firstRevealed.current;
    if (index === null) return;
    firstRevealed.current = null;
    listRef.current?.children[index]?.querySelector("button")?.focus();
  }, [shown]);

  return (
    <section className={styles.history} aria-labelledby="history-heading">
      <h2 id="history-heading" className={styles.historyTitle}>
        Past runs
      </h2>
      {resource.status === "loading" ? <LoadingRows rows={2} label="Loading past runs" /> : null}
      {resource.status === "error" ? <ErrorState error={resource.error} onRetry={reload} /> : null}
      {resource.status === "ready" && runs.length === 0 ? (
        <p className={styles.historyEmpty}>This config has not been run yet.</p>
      ) : null}
      {runs.length > 0 ? (
        <ul ref={listRef} className={styles.runList}>
          {runs.slice(0, shown).map((run) => (
            <li key={run.id}>
              <button
                type="button"
                className={styles.runItem}
                aria-current={run.id === selectedRunId || undefined}
                onClick={() => {
                  onSelect(run.id);
                }}
              >
                <span className={styles.runWhen}>
                  <time dateTime={run.startedAt}>{formatDateTime(run.startedAt)}</time>
                </span>
                <span className="badge" data-tone={run.status}>
                  {STATUS_LABEL[run.status]}
                </span>
                <span className={styles.runCount}>
                  {run.status === "running" ? "In progress" : plural(run.stats.evaluated, "lead") + " scored"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {shown < runs.length ? (
        <button
          type="button"
          className={`button button-quiet ${styles.showOlder}`}
          onClick={() => {
            firstRevealed.current = shown;
            setLimit(shown + RUNS_PER_PAGE);
          }}
        >
          Show older runs
          <span className={styles.olderCount}>{runs.length - shown}</span>
        </button>
      ) : null}
    </section>
  );
}
