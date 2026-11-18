"use client";

import { useCallback } from "react";
import { api } from "@/api-client/api";
import type { SearchConfigSummary } from "@/api-client/types";
import { useResource } from "@/api-client/use-resource";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { RunFunnel } from "./RunFunnel";
import styles from "./search.module.css";

export function latestRunElsewhere(configs: readonly SearchConfigSummary[], configId: string) {
  let latest: { config: SearchConfigSummary; runId: string; startedAt: string } | null = null;
  for (const config of configs) {
    const run = config.lastRun;
    if (!run || config.id === configId || run.status === "running") continue;
    if (!latest || run.startedAt > latest.startedAt)
      latest = { config, runId: run.id, startedAt: run.startedAt };
  }
  return latest;
}

interface LatestRunProps {
  config: SearchConfigSummary;
  runId: string;
  onOpen: (configId: string, runId: string) => void;
}

export function LatestRun({ config, runId, onOpen }: LatestRunProps) {
  const load = useCallback(() => api.searches.get(runId), [runId]);
  const { resource } = useResource(load);
  if (resource.status !== "ready") return null;
  const { run } = resource.data;

  return (
    <section className={styles.latest} aria-labelledby="latest-heading">
      <div className={styles.latestHead}>
        <div>
          <h3 id="latest-heading" className={styles.latestTitle}>
            Latest run: {config.name}
          </h3>
          <p className={styles.latestWhen}>
            <RelativeTime iso={run.startedAt} />
          </p>
        </div>
        <button
          type="button"
          className="button button-quiet"
          onClick={() => {
            onOpen(config.id, run.id);
          }}
        >
          Open run
        </button>
      </div>
      <RunFunnel run={run} size="mini" />
    </section>
  );
}
