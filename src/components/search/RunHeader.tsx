"use client";

import { useRef, useState } from "react";
import { api } from "@/api-client/api";
import { ApiError, describeApiError } from "@/api-client/api-error";
import type { SearchRun, SearchType } from "@/api-client/types";
import { formatDateTime, formatDuration, plural } from "@/components/format";
import { Notice } from "@/components/ui/states";
import { STATUS_LABEL } from "./run-labels";
import { TierBar, tierBreakdown, totalLeads } from "./TierBar";
import styles from "./search.module.css";

export function runAnnouncement(run: SearchRun): string {
  if (run.status === "running") return "Search running.";
  const leads = totalLeads(run.tierCounts);
  const found = leads > 0 ? ` ${plural(leads, "lead")}: ${tierBreakdown(run.tierCounts)}.` : "";
  return `Search ${STATUS_LABEL[run.status].toLowerCase()}.${found}`;
}

interface RunHeaderProps {
  run: SearchRun;
  types: readonly SearchType[];
  onRunChange: (run: SearchRun) => void;
}

export function RunHeader({ run, types, onRunChange }: RunHeaderProps) {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const typeLabel = types.find((type) => type.id === run.configType)?.label;

  const cancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    setError(null);
    try {
      onRunChange(await api.searches.cancel(run.id));
      titleRef.current?.focus();
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
          <h2 ref={titleRef} className={styles.runTitle} tabIndex={-1}>
            {run.configName}
          </h2>
          <span className="badge" data-tone={run.status}>
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
      <p className="visually-hidden" role="status">
        {runAnnouncement(run)}
      </p>
      {run.status === "running" ? (
        <div className={styles.cancel}>
          <button
            type="button"
            className="button"
            aria-disabled={cancelling || undefined}
            aria-describedby="cancel-hint"
            onClick={() => void cancel()}
          >
            {cancelling ? "Cancelling…" : "Cancel search"}
          </button>
          <p id="cancel-hint" className={styles.cancelHint}>
            Leads already scored are kept
          </p>
        </div>
      ) : null}
      {run.status === "running" || totalLeads(run.tierCounts) > 0 ? (
        <div className={styles.runTiers}>
          <TierBar counts={run.tierCounts} pending={run.status === "running"} />
        </div>
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
