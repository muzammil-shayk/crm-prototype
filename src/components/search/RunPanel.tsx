import { useState } from "react";
import type { RunSnapshot } from "@/api-client/api";
import type { Lead, SearchRun, SearchType } from "@/api-client/types";
import { LeadResults } from "@/components/leads/LeadResults";
import { CheckIcon } from "@/components/ui/icons";
import { ErrorState, LoadingRows, Notice } from "@/components/ui/states";
import { STAGES } from "./run-labels";
import { RunHeader } from "./RunHeader";
import { RunOutcome, RunStatsList } from "./RunOutcome";
import styles from "./search.module.css";

interface RunPanelProps {
  snapshot: RunSnapshot | null;
  pollError: unknown;
  types: readonly SearchType[];
  openLeadId: string | null;
  onRunChange: (run: SearchRun) => void;
  onOpenLead: (leadId: string | null) => void;
  onLeadChange: (lead: Lead) => void;
}

function useWatchedFinish(run: SearchRun | undefined): boolean {
  const [watched, setWatched] = useState<{ id: string; counted: boolean } | null>(null);
  let next = watched;
  if (run?.status === "running") {
    const counted = run.id === watched?.id && watched.counted;
    next = { id: run.id, counted: counted || run.stage !== STAGES[0]?.id };
  } else if (run?.id !== watched?.id) {
    next = null;
  }
  if (next?.id !== watched?.id || next?.counted !== watched?.counted) setWatched(next);
  return run !== undefined && run.status !== "running" && next?.id === run.id && !next.counted;
}

export function RunPanel({ snapshot, pollError, types, onRunChange, ...leadProps }: RunPanelProps) {
  const replay = useWatchedFinish(snapshot?.run);
  if (!snapshot) {
    return pollError ? (
      <ErrorState error={pollError} subject="run" />
    ) : (
      <LoadingRows rows={3} label="Loading the search run" />
    );
  }

  const { run, leads } = snapshot;
  return (
    <div className={styles.panel}>
      <RunHeader run={run} types={types} onRunChange={onRunChange} />
      {pollError ? (
        <Notice tone="warning" live>
          <p>Lost contact with the server. Retrying every few seconds.</p>
        </Notice>
      ) : null}
      {run.status === "running" ? (
        <RunProgress run={run} />
      ) : (
        <>
          <RunOutcome run={run} leadCount={leads.length} replay={replay} />
          {leads.length > 0 ? (
            <LeadResults leads={leads} configType={run.configType} types={types} {...leadProps} />
          ) : null}
        </>
      )}
    </div>
  );
}

function RunProgress({ run }: { run: SearchRun }) {
  const currentIndex = STAGES.findIndex((stage) => stage.id === run.stage);
  const current = STAGES[currentIndex];

  return (
    <div className={styles.progress}>
      <div className={styles.progressHead}>
        <p className={styles.progressStage} aria-live="polite">
          {current ? `${current.label}…` : "Working…"}
        </p>
        <p className={`${styles.progressValue} mono`}>{run.progress}%</p>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label="Search progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={run.progress}
      >
        <span className={styles.progressFill} style={{ transform: `scaleX(${run.progress / 100})` }} />
      </div>
      <ol className={styles.stages}>
        {STAGES.map((stage, index) => {
          const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "pending";
          return (
            <li key={stage.id} className={styles.stage} data-state={state}>
              <span className={styles.stageMark} aria-hidden="true">
                {state === "done" ? <CheckIcon /> : null}
              </span>
              <span>{stage.label}</span>
              {state === "done" ? <span className="visually-hidden">(done)</span> : null}
              {state === "current" ? <span className="visually-hidden">(in progress)</span> : null}
            </li>
          );
        })}
      </ol>
      <RunStatsList stats={run.stats} reached={run.stage} live />
      <p className={styles.progressNote}>
        Progress updates every half second. You can leave this page; the search keeps running and its results
        stay in Past runs.
      </p>
    </div>
  );
}
