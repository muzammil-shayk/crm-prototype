import { api } from "@/api-client/api";
import { ApiError } from "@/api-client/api-error";
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

export const searchUrl = (configId: string, runId?: string) =>
  `/search?${new URLSearchParams(runId ? { config: configId, run: runId } : { config: configId }).toString()}`;
