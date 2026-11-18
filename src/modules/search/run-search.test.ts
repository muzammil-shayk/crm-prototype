import { describe, expect, it } from "vitest";
import type { SearchProvider } from "@/modules/providers/provider-types";
import { parseSearchConfigInput } from "@/modules/search-types/registry";
import { fixtureSearch } from "../../../test/mock-postings";
import { memoryCache } from "../../../test/pipeline-context";
import { MockLlmProvider } from "@/modules/providers/mock/mock-llm-provider";
import { runSearch, type RunProgress, type SearchDependencies } from "./run-search";

const config = parseSearchConfigInput({
  type: "buyers-seeking-providers",
  name: "Healthcare and fintech teams hiring an app agency",
  criteria: {
    keywords: ["patient portal", "looking for an agency", "development partner"],
    excludedKeywords: ["equity only"],
    industries: ["healthcare", "fintech"],
    locations: ["United Kingdom", "United States"],
    minBudgetUsd: 20000,
  },
});

function dependencies(overrides: Partial<SearchDependencies> = {}): SearchDependencies {
  return {
    search: fixtureSearch(),
    llm: new MockLlmProvider(),
    cache: memoryCache(),
    searchCacheTtlMs: 60 * 60 * 1000,
    limits: { maxQueries: 8, maxLeads: 25, maxCostUnits: 60 },
    retry: { attempts: 2, timeoutMs: 200, backoffMs: 1 },
    ...overrides,
  };
}

function start(deps: SearchDependencies, signal = new AbortController().signal) {
  const progress: RunProgress[] = [];
  const outcome = runSearch({ config, organizations: [], configHash: "hash-a" }, deps, {
    signal,
    onProgress: (update) => progress.push(update),
  });
  return { outcome, progress };
}

describe("runSearch", () => {
  it("keeps only jobs posted in the target places and industries", async () => {
    const jobs = parseSearchConfigInput({
      type: "jobs-for-our-organizations",
      name: "Remote data work for shops and clinics",
      criteria: {
        keywords: ["data pipeline", "cloud migration"],
        industries: ["ecommerce", "healthcare"],
        locations: ["Remote"],
        servicesToMatch: ["dbt"],
      },
    });

    const result = await runSearch(
      { config: jobs, organizations: [], configHash: "hash-jobs" },
      dependencies(),
      {
        signal: new AbortController().signal,
        onProgress: () => undefined,
      },
    );

    expect(result.leads.map((lead) => lead.company).sort()).toEqual([
      "Calder Health Analytics",
      "Fenwick Retail Group",
      "Hollis & Grant",
    ]);
    expect(result.stats.outsideFilters).toBe(4);
  });

  it("classifies every lead with an explanation and quoted evidence", async () => {
    const { outcome, progress } = start(dependencies());
    const result = await outcome;

    expect(result.status).toBe("completed");
    expect(result.leads.map((lead) => [lead.company, lead.tier])).toEqual([
      ["Harbourside Dental Group", "strong"],
      ["Copperleaf Insurance", "strong"],
      ["Pinewood Credit Union", "strong"],
      ["Northgate Private Clinic", "weak"],
      ["Ledgerline", "weak"],
      ["Meridian Physio", "weak"],
    ]);
    expect(result.leads.find((lead) => lead.company === "Northgate Private Clinic")?.evidence).toEqual([]);
    expect(result.stats).toEqual({
      queries: 3,
      queryFailures: 0,
      retrieved: 12,
      duplicates: 2,
      excluded: 1,
      outsideFilters: 3,
      evaluated: 6,
      evaluationFailures: 0,
      costUnits: 9,
    });
    expect(progress.map((update) => update.stage).filter((stage, i, all) => stage !== all[i - 1])).toEqual([
      "generating_queries",
      "retrieving",
      "filtering",
      "evaluating",
      "classifying",
    ]);
    expect(progress.map((update) => update.progress)).toEqual(
      [...progress.map((update) => update.progress)].sort((a, b) => a - b),
    );
  });

  it("finishes as partial with a warning when one query fails", async () => {
    const search: SearchProvider = {
      id: "flaky-search",
      search: (query, signal) =>
        query.text === "patient portal"
          ? Promise.reject(new Error("503 Service Unavailable"))
          : fixtureSearch().search(query, signal),
    };

    const result = await start(dependencies({ search })).outcome;

    expect(result.status).toBe("partial");
    expect(result.warnings).toEqual([
      'Query "patient portal": The search provider failed: 503 Service Unavailable (after 2 attempts)',
    ]);
    expect(result.leads.length).toBeGreaterThan(0);
  });

  it("fails when every query fails", async () => {
    const search: SearchProvider = {
      id: "down-search",
      search: () => Promise.reject(new Error("DNS lookup failed")),
    };

    const result = await start(dependencies({ search })).outcome;

    expect(result).toMatchObject({
      status: "failed",
      leads: [],
      error: "Every search query failed, so there were no leads to evaluate.",
    });
    expect(result.warnings).toHaveLength(3);
  });

  it("reports the lead cap when it cuts results", async () => {
    const result = await start(dependencies({ limits: { maxQueries: 8, maxLeads: 2, maxCostUnits: 60 } }))
      .outcome;

    expect(result.leads).toHaveLength(2);
    expect(result.limitsHit).toEqual(["max_leads"]);
    expect(result.status).toBe("partial");
  });

  it("reports the query cap and the cost cap", async () => {
    const result = await start(dependencies({ limits: { maxQueries: 1, maxLeads: 25, maxCostUnits: 2 } }))
      .outcome;

    expect(result.limitsHit).toEqual(["max_queries", "max_cost_units"]);
    expect(result.stats.costUnits).toBe(2);
  });

  it("stops when cancelled", async () => {
    const run = new AbortController();
    run.abort();

    await expect(start(dependencies(), run.signal).outcome).rejects.toThrow(DOMException);
  });
});
