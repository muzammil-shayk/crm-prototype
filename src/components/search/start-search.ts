import { useState } from "react";
import { api } from "@/api-client/api";
import { ApiError, describeApiError } from "@/api-client/api-error";
import type { SearchRun } from "@/api-client/types";

export async function startOrResumeSearch(configId: string): Promise<SearchRun> {
  try {
    return await api.searches.start(configId);
  } catch (error) {
    if (!(error instanceof ApiError) || error.code !== "run_in_progress") throw error;
    const running = (await api.searches.list(configId)).find((run) => run.status === "running");
    if (!running) throw error;
    return running;
  }
}

export function useStartSearch(onStarted: (configId: string, runId: string) => void) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async (configId: string) => {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const run = await startOrResumeSearch(configId);
      onStarted(configId, run.id);
    } catch (problem) {
      setError(describeApiError(problem));
    } finally {
      setStarting(false);
    }
  };

  return {
    starting,
    error,
    start,
    clearError: () => {
      setError(null);
    },
  };
}
