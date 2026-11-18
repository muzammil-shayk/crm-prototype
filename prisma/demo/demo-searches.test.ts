import { describe, expect, it } from "vitest";
import { MockLlmProvider } from "@/modules/providers/mock/mock-llm-provider";
import { MockSearchProvider } from "@/modules/providers/mock/mock-search-provider";
import { parseSearchConfigInput } from "@/modules/search-types/registry";
import { RUN_LIMITS } from "@/lib/run-limits";
import { runSearch } from "@/modules/search/run-search";
import { memoryCache } from "../../test/pipeline-context";
import { demoOrganizations } from "./organizations";
import { demoSearchConfigs } from "./search-configs";

type Row = [company: string, tier: string, score: number, organization?: string | null];

interface Expected {
  status: string;
  limitsHit: string[];
  stats: {
    queries: number;
    retrieved: number;
    duplicates: number;
    excluded: number;
    outsideFilters: number;
    evaluated: number;
  };
  leads: Row[];
}

const expected: Record<string, Expected> = {
  "Healthcare and fintech teams hiring an app agency": {
    status: "completed",
    limitsHit: [],
    stats: { queries: 3, retrieved: 17, duplicates: 5, excluded: 2, outsideFilters: 3, evaluated: 7 },
    leads: [
      ["Harbourside Dental Group", "strong", 90],
      ["Lakeshore Family Health", "strong", 90],
      ["Copperleaf Insurance", "strong", 70],
      ["Pinewood Credit Union", "strong", 70],
      ["Northgate Private Clinic", "weak", 50],
      ["Ledgerline", "weak", 35],
      ["Meridian Physio", "weak", 35],
    ],
  },
  "Gulf brands shopping for SEO and content": {
    status: "completed",
    limitsHit: [],
    stats: { queries: 2, retrieved: 11, duplicates: 2, excluded: 1, outsideFilters: 4, evaluated: 4 },
    leads: [
      ["Al Noor Residences", "strong", 90],
      ["Souq Lane", "strong", 90],
      ["Desert Bloom Hotels", "strong", 70],
      ["Gulfstar Auto Parts", "weak", 50],
    ],
  },
  "Security audits for fintech and SaaS": {
    status: "completed",
    limitsHit: [],
    stats: { queries: 3, retrieved: 12, duplicates: 2, excluded: 3, outsideFilters: 1, evaluated: 6 },
    leads: [
      ["Fieldstone Payments", "strong", 75],
      ["Brightline Pharmacy", "medium", 55],
      ["Vellum Legal", "medium", 55],
      ["Crescent Microfinance", "weak", 55],
      ["Hearth Home Care", "weak", 35],
      ["Orbitly", "weak", 20],
    ],
  },
  "Data and cloud contracts for our studios": {
    status: "completed",
    limitsHit: [],
    stats: { queries: 6, retrieved: 23, duplicates: 13, excluded: 1, outsideFilters: 2, evaluated: 7 },
    leads: [
      ["Fenwick Retail Group", "strong", 85, "Northwind Data Studio"],
      ["Calder Health Analytics", "strong", 75, "Northwind Data Studio"],
      ["Hollis & Grant", "strong", 75, "Northwind Data Studio"],
      ["Kiran Foods", "strong", 75, "Northwind Data Studio"],
      ["Ridgeback Games", "medium", 65, "Larkspur Cloud"],
      ["Corvid Robotics", "medium", 45, "Larkspur Cloud"],
      ["Greyfield Freight", "weak", 45, null],
    ],
  },
  "Mobile builds for Kestrel and Quayside": {
    status: "completed",
    limitsHit: [],
    stats: { queries: 5, retrieved: 18, duplicates: 9, excluded: 1, outsideFilters: 3, evaluated: 5 },
    leads: [
      ["Learnloop", "strong", 100, "Kestrel Mobile"],
      ["Sabz Microfinance", "strong", 100, "Kestrel Mobile"],
      ["Mehran Health", "strong", 90, "Quayside Apps"],
      ["Tidewater Schools", "strong", 80, "Kestrel Mobile"],
      ["Brightpath Insurance", "strong", 70, "Kestrel Mobile"],
    ],
  },
  "Health IT and logistics integrations": {
    status: "partial",
    limitsHit: ["max_queries"],
    stats: { queries: 8, retrieved: 6, duplicates: 3, excluded: 0, outsideFilters: 1, evaluated: 2 },
    leads: [
      ["Rahbar Diagnostics", "strong", 100, "Medlink Health IT"],
      ["Falcon Haulage", "strong", 90, "Tessera Freight Systems"],
    ],
  },
};

const organizations = demoOrganizations.map(({ name, services }) => ({ id: name, name, services }));

async function run(input: (typeof demoSearchConfigs)[number]) {
  const config = parseSearchConfigInput(input);
  return runSearch(
    { config, organizations, configHash: config.name },
    {
      search: new MockSearchProvider(),
      llm: new MockLlmProvider(),
      cache: memoryCache(),
      searchCacheTtlMs: 60_000,
      limits: RUN_LIMITS,
      retry: { attempts: 1, timeoutMs: 1000, backoffMs: 1 },
    },
    { signal: new AbortController().signal, onProgress: () => undefined },
  );
}

describe("demo search configs on the demo postings", () => {
  it("covers three configs of each search type", () => {
    expect(demoSearchConfigs.map((config) => config.name).sort()).toEqual(Object.keys(expected).sort());
  });

  it.each(demoSearchConfigs.map((config) => [config.name, config] as const))("%s", async (name, input) => {
    const want = expected[name];
    const outcome = await run(input);
    const isJob = input.type === "jobs-for-our-organizations";

    expect(outcome.status).toBe(want?.status);
    expect(outcome.limitsHit).toEqual(want?.limitsHit);
    expect(outcome.stats).toEqual({
      ...want?.stats,
      queryFailures: 0,
      evaluationFailures: 0,
      costUnits: (want?.stats.queries ?? 0) + (want?.stats.evaluated ?? 0),
    });
    expect(
      outcome.leads.map((lead): Row =>
        isJob
          ? [lead.company, lead.tier, lead.score, lead.matchedOrganizationId]
          : [lead.company, lead.tier, lead.score],
      ),
    ).toEqual(want?.leads);
  });

  it("forces every high-scoring lead without a quote to Weak", async () => {
    const forced = [];
    for (const input of demoSearchConfigs) {
      const { leads } = await run(input);
      forced.push(...leads.filter((lead) => lead.evidence.length === 0).map((lead) => lead.company));
    }

    expect(forced.sort()).toEqual([
      "Crescent Microfinance",
      "Greyfield Freight",
      "Gulfstar Auto Parts",
      "Northgate Private Clinic",
    ]);
  });
});
