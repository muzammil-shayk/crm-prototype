"use client";

import { useState } from "react";
import { api } from "@/api-client/api";
import { useResource } from "@/api-client/use-resource";
import { LeadDetail } from "@/components/leads/LeadDetail";
import { ErrorState, LoadingRows } from "@/components/ui/states";
import { RunHistory } from "./RunHistory";
import { RunPanel } from "./RunPanel";
import { SearchControls } from "./SearchControls";
import { searchUrl } from "./start-search";
import styles from "./search.module.css";
import { useRunPolling } from "./use-run-polling";

interface LiveSearchProps {
  initialConfigId: string | null;
  initialRunId: string | null;
}

export function LiveSearch({ initialConfigId, initialRunId }: LiveSearchProps) {
  const configs = useResource(api.configs.list);
  const types = useResource(api.searchTypes);
  const [chosenConfigId, setChosenConfigId] = useState(initialConfigId);
  const [runId, setRunId] = useState(initialRunId);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const polling = useRunPolling(runId);

  const configList = configs.resource.status === "ready" ? configs.resource.data : [];
  const wanted = chosenConfigId ?? polling.snapshot?.run.configId;
  const configId = (configList.find((config) => config.id === wanted) ?? configList[0])?.id ?? null;
  const typeList = types.resource.status === "ready" ? types.resource.data : [];
  const openLead = polling.snapshot?.leads.find((lead) => lead.id === openLeadId) ?? null;

  const show = (nextConfigId: string, nextRunId: string | null) => {
    setChosenConfigId(nextConfigId);
    setRunId(nextRunId);
    setOpenLeadId(null);
    window.history.replaceState(null, "", searchUrl(nextConfigId, nextRunId ?? undefined));
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Live search</h1>
          <p className="page-lede">Run a saved config, watch it work, then triage the leads it finds.</p>
        </div>
      </div>

      {configs.resource.status === "loading" ? <LoadingRows rows={2} label="Loading search configs" /> : null}
      {configs.resource.status === "error" ? (
        <ErrorState error={configs.resource.error} onRetry={configs.reload} />
      ) : null}
      {configs.resource.status === "ready" ? (
        <div className={styles.layout}>
          <aside className={styles.side}>
            <SearchControls
              configs={configList}
              types={typeList}
              configId={configId}
              currentRun={polling.snapshot?.run ?? null}
              onSelectConfig={(id) => {
                show(id, null);
              }}
              onStarted={(startedConfigId, startedRunId) => {
                show(startedConfigId, startedRunId);
              }}
            />
            {configId ? (
              <RunHistory
                key={configId}
                configId={configId}
                currentRun={polling.snapshot?.run ?? null}
                selectedRunId={runId}
                onSelect={(id) => {
                  show(configId, id);
                }}
              />
            ) : null}
          </aside>
          <section className={styles.main} aria-label="Search run">
            <RunPanel
              runId={runId}
              snapshot={polling.snapshot}
              pollError={polling.error}
              types={typeList}
              onRunChange={polling.applyRun}
              onOpenLead={setOpenLeadId}
            />
          </section>
        </div>
      ) : null}

      <LeadDetail
        lead={openLead}
        configType={polling.snapshot?.run.configType ?? ""}
        types={typeList}
        onClose={() => {
          setOpenLeadId(null);
        }}
        onLeadChange={polling.applyLead}
      />
    </div>
  );
}
