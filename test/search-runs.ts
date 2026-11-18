import { MockLlmProvider } from "@/modules/providers/mock/mock-llm-provider";
import type { LlmProvider, SearchProvider } from "@/modules/providers/provider-types";
import type { SearchDependencies } from "@/modules/search/run-search";
import { getSearchRun } from "@/modules/search/search-service";
import { fixtureSearch } from "./mock-postings";
import { memoryCache } from "./pipeline-context";

export function dependencies(search: SearchProvider = fixtureSearch()): SearchDependencies {
  return {
    search,
    llm: new MockLlmProvider(),
    cache: memoryCache(),
    searchCacheTtlMs: 60 * 60 * 1000,
    limits: { maxQueries: 8, maxLeads: 25, maxCostUnits: 60 },
    retry: { attempts: 1, timeoutMs: 1000, backoffMs: 1 },
  };
}

export function heldSearch(): SearchProvider & { release: () => void } {
  const { promise: gate, resolve: release } = Promise.withResolvers<undefined>();
  const inner = fixtureSearch();
  return {
    id: "held-search",
    release: () => {
      release(undefined);
    },
    search: async (query, signal) => {
      await gate;
      return inner.search(query, signal);
    },
  };
}

export function heldLlm(passThrough: number): LlmProvider & { release: () => void; reached: Promise<void> } {
  const { promise: gate, resolve: release } = Promise.withResolvers<undefined>();
  const { promise: reached, resolve: reach } = Promise.withResolvers<undefined>();
  const inner = new MockLlmProvider();
  let calls = 0;
  return {
    id: inner.id,
    reached: reached.then(() => undefined),
    release: () => {
      release(undefined);
    },
    evaluateLead: async (request, signal) => {
      calls += 1;
      if (calls > passThrough) {
        reach(undefined);
        await gate;
      }
      return inner.evaluateLead(request, signal);
    },
  };
}

export async function settled(runId: string) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const view = await getSearchRun(runId);
    if (view.run.status !== "running") return view;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Run ${runId} did not settle`);
}
