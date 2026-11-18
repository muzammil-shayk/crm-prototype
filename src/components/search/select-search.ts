import type { SearchConfigSummary, SearchRun } from "@/api-client/types";

export function withLiveRun(
  configs: readonly SearchConfigSummary[],
  run: SearchRun | null,
): SearchConfigSummary[] {
  if (!run) return [...configs];
  return configs.map((config) => {
    const known = config.lastRun;
    if (config.id !== run.configId || (known && known.startedAt > run.startedAt)) return config;
    const { id, status, startedAt, finishedAt, tierCounts } = run;
    return { ...config, lastRun: { id, status, startedAt, finishedAt, tierCounts } };
  });
}

interface Wanted {
  configId: string | null;
  runId: string | null;
}

export interface SearchSelection {
  config: SearchConfigSummary | null;
  runId: string | null;
  missing: boolean;
}

export function selectSearch(configs: readonly SearchConfigSummary[], wanted: Wanted): SearchSelection {
  const chosen = configs.find((config) => config.id === wanted.configId);
  const config = chosen ?? configs[0] ?? null;
  return {
    config,
    runId: wanted.runId ?? config?.lastRun?.id ?? null,
    missing: wanted.configId !== null && !chosen,
  };
}

export const searchUrl = (configId: string, runId?: string | null) =>
  `/search?${new URLSearchParams(runId ? { config: configId, run: runId } : { config: configId }).toString()}`;
