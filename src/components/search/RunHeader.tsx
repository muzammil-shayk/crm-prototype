"use client";

import { useState } from "react";
import { api } from "@/api-client/api";
import { ApiError, describeApiError } from "@/api-client/api-error";
import type { SearchRun, SearchType } from "@/api-client/types";
import { formatDateTime, formatDuration } from "@/components/format";
import { Notice } from "@/components/ui/states";
import { STATUS_LABEL } from "./run-labels";
import styles from "./search.module.css";

interface RunHeaderProps {
  run: SearchRun;
  types: readonly SearchType[];
  onRunChange: (run: SearchRun) => void;
}

export function RunHeader({ run, types, onRunChange }: RunHeaderProps) {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const typeLabel = types.find((type) => type.id === run.configType)?.label;

  const cancel = async () => {
    setCancelling(true);
    setError(null);
    try {
      onRunChange(await api.searches.cancel(run.id));
    } catch (problem) {
      const finished = problem instanceof ApiError && problem.code === "run_not_cancellable";
      setError(finished ? `${describeApiError(problem)} Its results are below.` : describeApiError(problem));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <header className={styles.runHeader}>
      <div className={styles.runHeading}>
        <div className={styles.runTitleRow}>
          <h2 className={styles.runTitle}>{run.configName}</h2>
          <span className="badge" data-tone={run.status} aria-live="polite">
            {STATUS_LABEL[run.status]}
          </span>
        </div>
        <p className={styles.runMeta}>
          {typeLabel ? <span>{typeLabel}</span> : null}
          <span>
            Started <time dateTime={run.startedAt}>{formatDateTime(run.startedAt)}</time>
          </span>
          {run.finishedAt ? <span>Took {formatDuration(run.startedAt, run.finishedAt)}</span> : null}
        </p>
      </div>
      {run.status === "running" ? (
        <button type="button" className="button" disabled={cancelling} onClick={() => void cancel()}>
          {cancelling ? "Cancelling…" : "Cancel search"}
        </button>
      ) : null}
      {error ? (
        <div className={styles.runHeaderNotice}>
          <Notice tone="warning" live>
            <p>{error}</p>
          </Notice>
        </div>
      ) : null}
    </header>
  );
}
