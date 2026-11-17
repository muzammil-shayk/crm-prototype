import { requestJson, requestNoContent } from "./request";
import type { Lead, LeadStatus, SearchConfig, SearchConfigDraft, SearchRun, SearchType } from "./types";

const configPath = (id: string) => `/api/configs/${encodeURIComponent(id)}`;
const runPath = (id: string) => `/api/searches/${encodeURIComponent(id)}`;

export interface RunSnapshot {
  run: SearchRun;
  leads: Lead[];
}

export const api = {
  searchTypes: async (): Promise<SearchType[]> =>
    (await requestJson<{ searchTypes: SearchType[] }>("/api/search-types")).searchTypes,

  configs: {
    list: async (): Promise<SearchConfig[]> =>
      (await requestJson<{ configs: SearchConfig[] }>("/api/configs")).configs,
    get: async (id: string): Promise<SearchConfig> =>
      (await requestJson<{ config: SearchConfig }>(configPath(id))).config,
    create: async (input: SearchConfigDraft): Promise<SearchConfig> =>
      (await requestJson<{ config: SearchConfig }>("/api/configs", { method: "POST", body: input })).config,
    update: async (id: string, input: SearchConfigDraft): Promise<SearchConfig> =>
      (await requestJson<{ config: SearchConfig }>(configPath(id), { method: "PUT", body: input })).config,
    duplicate: async (id: string): Promise<SearchConfig> =>
      (await requestJson<{ config: SearchConfig }>(`${configPath(id)}/duplicate`, { method: "POST" })).config,
    remove: (id: string): Promise<void> => requestNoContent(configPath(id), { method: "DELETE" }),
  },

  searches: {
    start: async (configId: string): Promise<SearchRun> =>
      (await requestJson<{ run: SearchRun }>("/api/searches", { method: "POST", body: { configId } })).run,
    list: async (configId: string): Promise<SearchRun[]> =>
      (await requestJson<{ runs: SearchRun[] }>(`/api/searches?configId=${encodeURIComponent(configId)}`))
        .runs,
    get: (id: string, signal?: AbortSignal): Promise<RunSnapshot> =>
      requestJson<RunSnapshot>(runPath(id), { signal }),
    cancel: async (id: string): Promise<SearchRun> =>
      (await requestJson<{ run: SearchRun }>(`${runPath(id)}/cancel`, { method: "POST" })).run,
  },

  leads: {
    setStatus: async (id: string, status: LeadStatus): Promise<Lead> =>
      (
        await requestJson<{ lead: Lead }>(`/api/leads/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: { status },
        })
      ).lead,
  },
};
