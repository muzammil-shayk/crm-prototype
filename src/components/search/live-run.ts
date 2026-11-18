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
