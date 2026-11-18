import type { RunSnapshot } from "@/api-client/api";
import type { SearchRun, SearchType } from "@/api-client/types";
import { LeadResults } from "@/components/leads/LeadResults";
import { ErrorState, LoadingRows, Notice } from "@/components/ui/states";
import { RunHeader } from "./RunHeader";
import { RunOutcome } from "./RunOutcome";
import { RunProgress } from "./RunProgress";
import styles from "./search.module.css";

interface RunPanelProps {
  snapshot: RunSnapshot | null;
  pollError: unknown;
  types: readonly SearchType[];
  onRunChange: (run: SearchRun) => void;
  onOpenLead: (leadId: string) => void;
}

export function RunPanel({ snapshot, pollError, types, onRunChange, onOpenLead }: RunPanelProps) {
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
          <RunOutcome run={run} leadCount={leads.length} />
          {leads.length > 0 ? <LeadResults leads={leads} onOpenLead={onOpenLead} /> : null}
        </>
      )}
    </div>
  );
}
