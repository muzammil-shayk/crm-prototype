import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { createConfig, updateConfig } from "@/modules/configs/config-service";
import type { SearchProvider } from "@/modules/providers/provider-types";
import { resetDatabase, seedOrganizations } from "../../../test/database";
import { memoryCache } from "../../../test/pipeline-context";
import { dependencies, heldLlm, heldSearch, settled } from "../../../test/search-runs";
import { searchRunRepository } from "./search-run-repository";
import { cancelSearch, getSearchRun, listSearchRuns, startSearch } from "./search-service";

const buyersInput = {
  type: "buyers-seeking-providers",
  name: "Clinics hiring an agency",
  criteria: { keywords: ["patient portal"], industries: ["healthcare"], locations: ["United Kingdom"] },
};

describe("search service", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedOrganizations();
  });

  it("runs a saved config in the background and stores tiered leads with evidence", async () => {
    const config = await createConfig(buyersInput);

    const started = await startSearch(config.id, dependencies());
    expect(started).toMatchObject({ status: "running", configName: "Clinics hiring an agency" });

    const { run, leads } = await settled(started.id);
    expect(run).toMatchObject({
      status: "completed",
      progress: 100,
      error: null,
      limitsHit: [],
      warnings: [],
    });
    expect(run.stats).toMatchObject({ evaluated: 2, outsideFilters: 1 });
    expect(leads.map((lead) => [lead.company, lead.tier])).toEqual([
      ["Harbourside Dental Group", "medium"],
      ["Northgate Private Clinic", "weak"],
    ]);
    expect(leads[0]?.evidence).toHaveLength(1);
  });

  it("stores the score breakdown of each lead with the run", async () => {
    const config = await createConfig(buyersInput);

    const { leads } = await settled((await startSearch(config.id, dependencies())).id);

    expect(leads[0]).toMatchObject({
      company: "Harbourside Dental Group",
      score: 50,
      signals: [
        { points: 20, reason: 'Mentions "patient portal".' },
        { points: 15, reason: "Healthcare is a target industry." },
        { points: 15, reason: "Bristol, United Kingdom matches the target locations." },
      ],
    });
  });

  it.each([
    ["locations", { locations: ["United States"] }],
    ["industries", { industries: ["fintech"] }],
  ])("asks the providers again after the %s filter changes", async (_field, change) => {
    const config = await createConfig(buyersInput);
    const cache = memoryCache();
    const deps = { ...dependencies(), cache };
    await settled((await startSearch(config.id, deps)).id);

    await updateConfig(config.id, { ...buyersInput, criteria: { ...buyersInput.criteria, ...change } });
    await settled((await startSearch(config.id, deps)).id);

    const configHashes = new Set([...cache.entries.keys()].map((key) => key.split(":")[2]));
    expect(configHashes.size).toBe(2);
  });

  it("links a job lead to the registered organization that can deliver it", async () => {
    const config = await createConfig({
      type: "jobs-for-our-organizations",
      name: "Data contracts",
      criteria: { keywords: ["data pipeline"], servicesToMatch: ["dbt"] },
    });

    const { leads } = await settled((await startSearch(config.id, dependencies())).id);

    expect(leads.find((lead) => lead.company === "Fenwick Retail Group")?.matchedOrganization).toEqual({
      id: "cm0northwind000000000000",
      name: "Northwind Data Studio",
    });
  });

  it("reports an unknown config", async () => {
    await expect(startSearch("cm0missing00000000000000", dependencies())).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("refuses a second run of the same config while one is running", async () => {
    const config = await createConfig(buyersInput);
    const search = heldSearch();
    const first = await startSearch(config.id, dependencies(search));

    await expect(startSearch(config.id, dependencies())).rejects.toThrow(
      new ConflictError("run_in_progress", "A search for this config is already running."),
    );
    search.release();
    await settled(first.id);
  });

  it("starts only one of two simultaneous requests for the same config", async () => {
    const config = await createConfig(buyersInput);

    const results = await Promise.allSettled([
      startSearch(config.id, dependencies()),
      startSearch(config.id, dependencies()),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual(["fulfilled", "rejected"]);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected?.reason).toEqual(
      new ConflictError("run_in_progress", "A search for this config is already running."),
    );
    const fulfilled = results.find((result) => result.status === "fulfilled");
    if (fulfilled?.status === "fulfilled") await settled(fulfilled.value.id);
  });

  it("lets the config run again after a start fails", async () => {
    const config = await createConfig(buyersInput);
    const spy = vi.spyOn(searchRunRepository, "create").mockRejectedValueOnce(new Error("SQLITE_FULL"));
    await expect(startSearch(config.id, dependencies())).rejects.toThrow("SQLITE_FULL");
    spy.mockRestore();

    const run = await startSearch(config.id, dependencies());

    expect((await settled(run.id)).run.status).toBe("completed");
  });

  it("never treats a run that is being created as left over from a restart", async () => {
    const config = await createConfig(buyersInput);
    const create = searchRunRepository.create.bind(searchRunRepository);
    const spy = vi.spyOn(searchRunRepository, "create").mockImplementation(async (run) => {
      const created = await create(run);
      await listSearchRuns({});
      return created;
    });

    try {
      const run = await startSearch(config.id, dependencies());
      expect((await settled(run.id)).run.status).toBe("completed");
    } finally {
      spy.mockRestore();
    }
  });

  it("cancels a running search and keeps it cancelled after the pipeline stops", async () => {
    const config = await createConfig(buyersInput);
    const search = heldSearch();
    const run = await startSearch(config.id, dependencies(search));

    expect((await cancelSearch(run.id)).status).toBe("cancelled");
    search.release();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(await getSearchRun(run.id)).toMatchObject({ run: { status: "cancelled" }, leads: [] });
  });

  it("shows the stats known so far while the run is still evaluating", async () => {
    const config = await createConfig(buyersInput);
    const llm = heldLlm(1);
    const run = await startSearch(config.id, { ...dependencies(), llm });
    await llm.reached;

    await vi.waitFor(async () => {
      const { run: live } = await getSearchRun(run.id);
      expect(live).toMatchObject({ status: "running", stage: "evaluating" });
      expect(live.stats).toMatchObject({ queries: 1, evaluated: 1, outsideFilters: 1, costUnits: 2 });
    });
    llm.release();
    expect((await settled(run.id)).run.stats).toMatchObject({ evaluated: 2, costUnits: 3 });
  });

  it("keeps the leads evaluated before a cancel and adds none after it", async () => {
    const config = await createConfig(buyersInput);
    const llm = heldLlm(1);
    const run = await startSearch(config.id, { ...dependencies(), llm });
    await llm.reached;

    const cancelled = await cancelSearch(run.id);
    llm.release();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(cancelled).toMatchObject({ status: "cancelled", tierCounts: { strong: 0, medium: 0, weak: 1 } });
    const { run: stored, leads } = await getSearchRun(run.id);
    expect(stored).toMatchObject({ status: "cancelled", tierCounts: { strong: 0, medium: 0, weak: 1 } });
    expect(leads.map((lead) => [lead.company, lead.tier])).toEqual([["Northgate Private Clinic", "weak"]]);
  });

  it("gives a full answer to the next run after a cancelled one", async () => {
    const config = await createConfig(buyersInput);
    const cache = memoryCache();
    const llm = heldLlm(1);
    const first = await startSearch(config.id, { ...dependencies(), cache, llm });
    await llm.reached;
    await cancelSearch(first.id);
    llm.release();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const { run, leads } = await settled((await startSearch(config.id, { ...dependencies(), cache })).id);

    expect(run).toMatchObject({ status: "completed", tierCounts: { strong: 0, medium: 1, weak: 1 } });
    expect(leads.map((lead) => [lead.company, lead.tier])).toEqual([
      ["Harbourside Dental Group", "medium"],
      ["Northgate Private Clinic", "weak"],
    ]);
  });

  it("refuses to cancel a finished search", async () => {
    const config = await createConfig(buyersInput);
    const { run } = await settled((await startSearch(config.id, dependencies())).id);

    await expect(cancelSearch(run.id)).rejects.toThrow(
      new ConflictError("run_not_cancellable", "This search has already finished (completed)."),
    );
  });

  it("marks a run left running by a previous server process as failed", async () => {
    const orphan = await db.searchRun.create({
      data: {
        configName: "Old",
        configType: "buyers-seeking-providers",
        configHash: "h",
        status: "running",
        stage: "evaluating",
      },
    });

    expect((await getSearchRun(orphan.id)).run).toMatchObject({
      status: "failed",
      error: "The server restarted before this search finished.",
    });
  });

  it("records a failed run with the reason when every query fails", async () => {
    const config = await createConfig(buyersInput);
    const down: SearchProvider = {
      id: "down-search",
      search: () => Promise.reject(new Error("connect ECONNREFUSED")),
    };

    const { run } = await settled((await startSearch(config.id, dependencies(down))).id);

    expect(run).toMatchObject({
      status: "failed",
      error: "Every search query failed, so there were no leads to evaluate.",
      warnings: [
        'Query "patient portal": The search provider failed: connect ECONNREFUSED (after 1 attempt)',
      ],
    });
  });

  it("lists runs for a config, newest first", async () => {
    const config = await createConfig(buyersInput);
    const first = await settled((await startSearch(config.id, dependencies())).id);
    const second = await settled((await startSearch(config.id, dependencies())).id);

    expect((await listSearchRuns({ configId: config.id })).map((run) => run.id)).toEqual([
      second.run.id,
      first.run.id,
    ]);
  });
});
