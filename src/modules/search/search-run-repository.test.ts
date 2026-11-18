import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createConfig } from "@/modules/configs/config-service";
import { resetDatabase } from "../../../test/database";
import { retrievedLead } from "../../../test/retrieved-lead";
import type { SearchOutcome } from "./run-search";
import { searchRunRepository } from "./search-run-repository";

const outcome: SearchOutcome = {
  status: "completed",
  leads: [
    {
      ...retrievedLead(),
      score: 90,
      evidence: ["We are looking for an agency"],
      explanation: "Strong fit.",
      matchedOrganizationId: null,
      signals: null,
      evaluationError: null,
      tier: "strong",
    },
  ],
  stats: {
    queries: 1,
    queryFailures: 0,
    retrieved: 1,
    duplicates: 0,
    excluded: 0,
    outsideFilters: 4,
    outsideLocation: 3,
    outsideIndustry: 1,
    evaluated: 1,
    evaluationFailures: 0,
    costUnits: 2,
  },
  limitsHit: [],
  warnings: [],
  error: null,
};

function classified(url: string, tier: "strong" | "medium" | "weak") {
  return { ...outcome.leads[0], url, tier } as SearchOutcome["leads"][number];
}

async function startedRun(id: string) {
  const config = await createConfig({
    type: "buyers-seeking-providers",
    name: "Clinics",
    criteria: { keywords: ["patient portal"] },
  });
  return searchRunRepository.create({
    id,
    configId: config.id,
    configName: "Clinics",
    configType: "buyers-seeking-providers",
    configHash: "h",
  });
}

describe("searchRunRepository tier counts", () => {
  beforeEach(resetDatabase);

  it("starts a new run with zero leads in every tier", async () => {
    const run = await startedRun("run-new");
    expect(run.tierCounts).toEqual({ strong: 0, medium: 0, weak: 0 });
  });

  it("counts a finished run's leads per tier", async () => {
    const run = await startedRun("run-counted");
    const leads = [
      classified("https://boards.example.org/a", "strong"),
      classified("https://boards.example.org/b", "weak"),
      classified("https://boards.example.org/c", "weak"),
    ];
    await searchRunRepository.finish(run.id, { ...outcome, leads });

    expect((await searchRunRepository.findById(run.id))?.tierCounts).toEqual({
      strong: 1,
      medium: 0,
      weak: 2,
    });
  });

  it("counts each listed run's leads separately", async () => {
    const first = await startedRun("run-first");
    await searchRunRepository.finish(first.id, {
      ...outcome,
      leads: [classified("https://boards.example.org/a", "medium")],
    });
    const second = await startedRun("run-second");

    const runs = await searchRunRepository.findMany({});

    expect(Object.fromEntries(runs.map((run) => [run.id, run.tierCounts]))).toEqual({
      "run-first": { strong: 0, medium: 1, weak: 0 },
      [second.id]: { strong: 0, medium: 0, weak: 0 },
    });
  });
});

describe("searchRunRepository stats", () => {
  beforeEach(resetDatabase);

  it("keeps the count of leads dropped by the location and industry filters", async () => {
    const run = await startedRun("run-filtered");
    await searchRunRepository.finish(run.id, outcome);

    expect((await searchRunRepository.findById(run.id))?.stats.outsideFilters).toBe(4);
  });

  it("keeps the location and industry split of the filter drops", async () => {
    const run = await startedRun("run-split");
    await searchRunRepository.finish(run.id, outcome);

    expect((await searchRunRepository.findById(run.id))?.stats).toMatchObject({
      outsideLocation: 3,
      outsideIndustry: 1,
    });
  });

  it("reads a zero split for a run stored before the split existed", async () => {
    const run = await startedRun("run-before-split");
    const { outsideLocation: _location, outsideIndustry: _industry, ...olderStats } = outcome.stats;
    await db.searchRun.update({ where: { id: run.id }, data: { stats: JSON.stringify(olderStats) } });

    expect((await searchRunRepository.findById(run.id))?.stats).toEqual({
      ...olderStats,
      outsideLocation: 0,
      outsideIndustry: 0,
    });
  });

  it("reads zero filtered leads for a run stored before the filters existed", async () => {
    const run = await startedRun("run-older");
    const {
      outsideFilters: _dropped,
      outsideLocation: _location,
      outsideIndustry: _industry,
      ...olderStats
    } = outcome.stats;
    await db.searchRun.update({ where: { id: run.id }, data: { stats: JSON.stringify(olderStats) } });

    expect((await searchRunRepository.findById(run.id))?.stats).toEqual({
      ...olderStats,
      outsideFilters: 0,
      outsideLocation: 0,
      outsideIndustry: 0,
    });
  });
});

describe("searchRunRepository.finish", () => {
  beforeEach(resetDatabase);

  it("does not overwrite a run that was cancelled while the pipeline was finishing", async () => {
    const config = await createConfig({
      type: "buyers-seeking-providers",
      name: "Clinics",
      criteria: { keywords: ["patient portal"] },
    });
    const run = await searchRunRepository.create({
      id: "run-cancelled-while-finishing",
      configId: config.id,
      configName: "Clinics",
      configType: "buyers-seeking-providers",
      configHash: "h",
    });
    await searchRunRepository.stop(run.id, "cancelled", null);

    await searchRunRepository.finish(run.id, outcome);

    expect((await searchRunRepository.findById(run.id))?.status).toBe("cancelled");
    expect(await db.lead.count({ where: { runId: run.id } })).toBe(0);
  });
});

describe("searchRunRepository.stop", () => {
  beforeEach(resetDatabase);

  it("stores the leads found so far together with the cancel", async () => {
    const run = await startedRun("run-cancelled-with-leads");

    expect(await searchRunRepository.stop(run.id, "cancelled", null, outcome.leads)).toBe(true);

    expect(await searchRunRepository.findById(run.id)).toMatchObject({
      status: "cancelled",
      tierCounts: { strong: 1, medium: 0, weak: 0 },
    });
  });

  it("adds no leads when the run had already finished", async () => {
    const run = await startedRun("run-finished-before-cancel");
    await searchRunRepository.finish(run.id, outcome);

    expect(await searchRunRepository.stop(run.id, "cancelled", null, outcome.leads)).toBe(false);

    expect(await searchRunRepository.findById(run.id)).toMatchObject({
      status: "completed",
      tierCounts: { strong: 1, medium: 0, weak: 0 },
    });
  });
});
