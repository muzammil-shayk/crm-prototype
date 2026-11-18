"use client";

import { useCallback, useState } from "react";
import { api, type RunSnapshot } from "@/api-client/api";
import type { SearchConfigSummary, SearchRun, SearchType } from "@/api-client/types";
import { useResource } from "@/api-client/use-resource";
import { LeadDetail } from "@/components/leads/LeadDetail";
import { ErrorState, LoadingRows, Notice } from "@/components/ui/states";
import { ConfigBrief } from "./ConfigBrief";
import { RunHistory } from "./RunHistory";
import { RunPanel } from "./RunPanel";
import { SearchControls } from "./SearchControls";
import { searchUrl, selectSearch, withLiveRun } from "./select-search";
import { useStartSearch } from "./start-search";
import styles from "./search.module.css";
import { useRunPolling } from "./use-run-polling";
import { useSearchUrl } from "./use-search-url";

interface LiveSearchProps {
  initialConfigId: string | null;
  initialRunId: string | null;
  initialConfigs?: SearchConfigSummary[];
  initialTypes?: SearchType[];
  initialRuns?: { configId: string; runs: SearchRun[] };
  initialSnapshot?: RunSnapshot;
}

export function LiveSearch(props: LiveSearchProps) {
  const configs = useResource(api.configs.list, props.initialConfigs);
  const types = useResource(api.searchTypes, props.initialTypes, { revalidate: false });
  const [wanted, setWanted] = useState({ configId: props.initialConfigId, runId: props.initialRunId });
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  const saved = configs.resource.status === "ready" ? configs.resource.data : null;
  const ready = saved !== null;
  const { config: chosen, runId, missing } = selectSearch(saved ?? [], wanted);
  const polling = useRunPolling(runId, props.initialSnapshot);
  const liveRun = polling.snapshot?.run ?? null;
  const configList = withLiveRun(saved ?? [], liveRun);
  const config = configList.find((item) => item.id === chosen?.id) ?? null;
  const configId = config?.id ?? null;
  const typeList = types.resource.status === "ready" ? types.resource.data : [];
  const openLead = polling.snapshot?.leads.find((lead) => lead.id === openLeadId) ?? null;
  const running = liveRun?.status === "running" && liveRun.configId === configId;

  const loadRuns = useCallback(
    () => (configId ? api.searches.list(configId) : Promise.resolve([])),
    [configId],
  );
  const runs = useResource(
    loadRuns,
    props.initialRuns?.configId === configId ? props.initialRuns.runs : undefined,
  );

  const pushUrl = useSearchUrl(ready, configId ? searchUrl(configId, runId) : "/search", setWanted);

  const show = (nextConfigId: string, nextRunId: string | null) => {
    setWanted({ configId: nextConfigId, runId: nextRunId });
    setOpenLeadId(null);
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
      {ready && missing ? (
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
      {ready ? (
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
                if (id !== configId) pushUrl();
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
                types={typeList}
                running={running}
                starting={starter.starting}
                onStart={() => void starter.start(config.id)}
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
