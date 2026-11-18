"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/api-client/api";
import { useResource } from "@/api-client/use-resource";
import { LeadDetail } from "@/components/leads/LeadDetail";
import { ErrorState, LoadingRows, Notice } from "@/components/ui/states";
import { ConfigBrief } from "./ConfigBrief";
import { withLiveRun } from "./live-run";
import { RunHistory } from "./RunHistory";
import { RunPanel } from "./RunPanel";
import { SearchControls } from "./SearchControls";
import { searchUrl } from "./start-search";
import styles from "./search.module.css";
import { useRunPolling } from "./use-run-polling";
import { useStartSearch } from "./use-start-search";

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
  const liveRun = polling.snapshot?.run ?? null;

  const configList = withLiveRun(configs.resource.status === "ready" ? configs.resource.data : [], liveRun);
  const find = (id: string | null | undefined) => configList.find((config) => config.id === id);
  const config = find(chosenConfigId) ?? find(liveRun?.configId) ?? configList[0];
  const configId = config?.id ?? null;
  const linkedConfigGone =
    configs.resource.status === "ready" &&
    chosenConfigId !== null &&
    chosenConfigId === initialConfigId &&
    !find(chosenConfigId);
  const typeList = types.resource.status === "ready" ? types.resource.data : [];
  const openLead = polling.snapshot?.leads.find((lead) => lead.id === openLeadId) ?? null;
  const running = liveRun?.status === "running" && liveRun.configId === configId;

  const loadRuns = useCallback(
    () => (configId ? api.searches.list(configId) : Promise.resolve([])),
    [configId],
  );
  const runs = useResource(loadRuns);
  const lastRun =
    runs.resource.status === "ready" ? (runs.resource.data[0] ?? null) : (config?.lastRun ?? null);

  useEffect(() => {
    if (linkedConfigGone)
      window.history.replaceState(null, "", configId ? searchUrl(configId, runId ?? undefined) : "/search");
  }, [linkedConfigGone, configId, runId]);

  const show = (nextConfigId: string, nextRunId: string | null) => {
    setChosenConfigId(nextConfigId);
    setRunId(nextRunId);
    setOpenLeadId(null);
    window.history.replaceState(null, "", searchUrl(nextConfigId, nextRunId ?? undefined));
  };
  const starter = useStartSearch(show);

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
      {linkedConfigGone ? (
        <div className={styles.goneNotice}>
          <Notice tone="warning" title="That config no longer exists" live>
            <p>
              {config
                ? `It may have been deleted. Showing ${config.name} instead.`
                : "It may have been deleted."}
            </p>
          </Notice>
        </div>
      ) : null}
      {configs.resource.status === "ready" ? (
        <div className={styles.layout}>
          <aside className={styles.side}>
            <SearchControls
              configs={configList}
              configId={configId}
              running={running}
              starting={starter.starting}
              error={starter.error}
              onSelectConfig={(id) => {
                starter.clearError();
                show(id, null);
              }}
              onStart={(id) => void starter.start(id)}
            />
            {configId ? (
              <RunHistory
                configId={configId}
                runs={runs.resource}
                onRetry={runs.reload}
                currentRun={liveRun}
                selectedRunId={runId}
                onSelect={(id) => {
                  show(configId, id);
                }}
              />
            ) : null}
          </aside>
          <section className={styles.main} aria-label="Search run">
            {runId ? (
              <RunPanel
                snapshot={polling.snapshot}
                pollError={polling.error}
                types={typeList}
                onRunChange={polling.applyRun}
                onOpenLead={setOpenLeadId}
              />
            ) : config ? (
              <ConfigBrief
                config={config}
                lastRun={lastRun}
                types={typeList}
                running={running}
                starting={starter.starting}
                onStart={() => void starter.start(config.id)}
                onOpenRun={(id) => {
                  show(config.id, id);
                }}
              />
            ) : null}
          </section>
        </div>
      ) : null}

      <LeadDetail
        lead={openLead}
        configType={liveRun?.configType ?? ""}
        types={typeList}
        onClose={() => {
          setOpenLeadId(null);
        }}
        onLeadChange={polling.applyLead}
      />
    </div>
  );
}
