import { MockLlmProvider } from "@/modules/providers/mock/mock-llm-provider";
import { fixtureSearch } from "./mock-postings";
import { CostBudget } from "@/modules/search/cost-budget";
import type { CachedResult, PipelineContext, ResultCache } from "@/modules/search/pipeline-types";

export function memoryCache(): ResultCache & { entries: Map<string, CachedResult> } {
  const entries = new Map<string, CachedResult>();
  return {
    entries,
    get: (key) => Promise.resolve(entries.get(key)),
    set: (key, value) => {
      entries.set(key, { value, storedAt: new Date() });
      return Promise.resolve();
    },
  };
}

export function pipelineContext(overrides: Partial<PipelineContext> = {}): PipelineContext {
  return {
    search: fixtureSearch(),
    llm: new MockLlmProvider(),
    cache: memoryCache(),
    searchCacheTtlMs: 60 * 60 * 1000,
    budget: new CostBudget(100),
    configHash: "hash-a",
    retry: { attempts: 2, timeoutMs: 200, backoffMs: 1 },
    signal: new AbortController().signal,
    ...overrides,
  };
}
