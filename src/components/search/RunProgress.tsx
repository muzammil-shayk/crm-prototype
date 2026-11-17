import type { SearchRun } from "@/api-client/types";
import { CheckIcon } from "@/components/ui/icons";
import { STAGES } from "./run-labels";
import styles from "./search.module.css";

export function RunProgress({ run }: { run: SearchRun }) {
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
      <p className={styles.progressNote}>
        Progress updates every half second. You can leave this page; the search keeps running and its results
        stay in Past runs.
      </p>
    </div>
  );
}
