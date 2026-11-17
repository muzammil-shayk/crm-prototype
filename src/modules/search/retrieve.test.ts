import { describe, expect, it } from "vitest";
import { MockSearchProvider } from "@/modules/providers/mock/mock-search-provider";
import type { SearchProvider, SearchQuery } from "@/modules/providers/provider-types";
import { memoryCache, pipelineContext } from "../../../test/pipeline-context";
import { CostBudget } from "./cost-budget";
import { retrieve } from "./retrieve";

const queries: SearchQuery[] = [
  { text: "patient portal", leadKind: "buyer" },
  { text: "React Native", leadKind: "buyer" },
];

function countingSearch(id = "mock-search"): SearchProvider & { calls: string[] } {
  const inner = new MockSearchProvider();
  const calls: string[] = [];
  return {
    id,
    calls,
    search: (query, signal) => {
      calls.push(query.text);
      return inner.search(query, signal);
    },
  };
}

describe("retrieve", () => {
  it("collects the leads of every query", async () => {
    const outcome = await retrieve(queries, pipelineContext());

    expect(outcome.leads.map((lead) => lead.company)).toEqual([
      "Northgate Private Clinic",
      "Harbourside Dental Group",
      "Sunrise Pediatrics",
      "Ledgerline",
    ]);
    expect(outcome.failures).toEqual([]);
  });

  it("keeps going when one query fails and counts the failure", async () => {
    const flaky: SearchProvider = {
      id: "flaky-search",
      search: (query, signal) =>
        query.text === "patient portal"
          ? Promise.reject(new Error("429 Too Many Requests"))
          : new MockSearchProvider().search(query, signal),
    };

    const outcome = await retrieve(queries, pipelineContext({ search: flaky }));

    expect(outcome.leads.map((lead) => lead.company)).toEqual(["Ledgerline"]);
    expect(outcome.failures).toEqual([
      'Query "patient portal": The search provider failed: 429 Too Many Requests (after 2 attempts)',
    ]);
  });

  it("counts a provider response with the wrong shape as a failed query", async () => {
    const broken: SearchProvider = {
      id: "broken",
      search: () => Promise.resolve([{ title: "no url" }] as unknown as []),
    };

    expect((await retrieve(queries.slice(0, 1), pipelineContext({ search: broken }))).failures).toHaveLength(
      1,
    );
  });

  it("does not retry a response with the wrong shape", async () => {
    let calls = 0;
    const broken: SearchProvider = {
      id: "broken",
      search: () => {
        calls += 1;
        return Promise.resolve([{ title: "no url" }] as unknown as []);
      },
    };

    const outcome = await retrieve(queries.slice(0, 1), pipelineContext({ search: broken }));

    expect(calls).toBe(1);
    expect(outcome.failures).toEqual([
      'Query "patient portal": The search provider failed: returned leads in an unexpected shape',
    ]);
  });

  it("answers a repeated query for the same config from the cache without spending budget", async () => {
    const search = countingSearch();
    const cache = memoryCache();
    await retrieve(queries, pipelineContext({ search, cache }));
    const budget = new CostBudget(100);

    const second = await retrieve(queries, pipelineContext({ search, cache, budget }));

    expect(search.calls).toHaveLength(2);
    expect(second.leads).toHaveLength(4);
    expect(budget.spent).toBe(0);
  });

  it("treats an unreadable cache entry as a miss", async () => {
    const cache = memoryCache();
    cache.entries.set("search:mock-search:hash-a:buyer:patient portal", {
      value: "{truncated",
      storedAt: new Date(),
    });

    const outcome = await retrieve(queries.slice(0, 1), pipelineContext({ cache }));

    expect({ leads: outcome.leads.length, failures: outcome.failures }).toEqual({ leads: 3, failures: [] });
  });

  it("asks again when a different search provider is configured", async () => {
    const first = countingSearch("mock-search");
    const second = countingSearch("serp-search");
    const cache = memoryCache();
    await retrieve(queries, pipelineContext({ search: first, cache }));
    await retrieve(queries, pipelineContext({ search: second, cache }));

    expect(second.calls).toHaveLength(2);
  });

  it("asks again once a cached result is older than the time to live", async () => {
    const search = countingSearch();
    const cache = memoryCache();
    await retrieve(queries, pipelineContext({ search, cache }));
    for (const entry of cache.entries.values()) entry.storedAt = new Date(Date.now() - 7 * 60 * 60 * 1000);

    await retrieve(queries, pipelineContext({ search, cache, searchCacheTtlMs: 6 * 60 * 60 * 1000 }));

    expect(search.calls).toHaveLength(4);
  });

  it("does not share cached results between different configs", async () => {
    const search = countingSearch();
    const cache = memoryCache();
    await retrieve(queries, pipelineContext({ search, cache, configHash: "hash-a" }));
    await retrieve(queries, pipelineContext({ search, cache, configHash: "hash-b" }));

    expect(search.calls).toHaveLength(4);
  });

  it("stops calling the provider once the cost budget is spent", async () => {
    const search = countingSearch();
    const budget = new CostBudget(1);

    const outcome = await retrieve(queries, pipelineContext({ search, budget }));

    expect(search.calls).toEqual(["patient portal"]);
    expect(budget.exhausted).toBe(true);
    expect(outcome.leads).toHaveLength(3);
  });

  it("stops when the run is cancelled", async () => {
    const run = new AbortController();
    run.abort();

    await expect(retrieve(queries, pipelineContext({ signal: run.signal }))).rejects.toThrow(DOMException);
  });
});
