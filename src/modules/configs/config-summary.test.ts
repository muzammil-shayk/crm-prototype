import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { resetDatabase } from "../../../test/database";
import { retrievedLead } from "../../../test/retrieved-lead";
import { createConfig, listConfigs } from "./config-service";

const clinicsInput = {
  type: "buyers-seeking-providers",
  name: "Clinics replacing their patient portal",
  criteria: { keywords: ["patient portal"] },
};

async function storeRun(
  configId: string,
  id: string,
  status: string,
  startedAt: string,
  finishedAt: string | null,
) {
  await db.searchRun.create({
    data: {
      id,
      configId,
      configName: clinicsInput.name,
      configType: clinicsInput.type,
      configHash: "h",
      status,
      stage: "classifying",
      startedAt: new Date(startedAt),
      finishedAt: finishedAt ? new Date(finishedAt) : null,
    },
  });
}

async function storeLead(runId: string, url: string, tier: string) {
  const { budgetUsd: _budget, engagementType: _engagement, ...lead } = retrievedLead({ url });
  await db.lead.create({
    data: {
      ...lead,
      runId,
      publishedAt: new Date(lead.publishedAt),
      score: 50,
      tier,
      explanation: "",
      evidence: "[]",
    },
  });
}

async function summaryOf(configId: string) {
  return (await listConfigs()).find((config) => config.id === configId);
}

describe("config list summaries", () => {
  beforeEach(resetDatabase);

  it("gives a config without runs no last run and a run count of zero", async () => {
    const config = await createConfig(clinicsInput);

    expect(await summaryOf(config.id)).toMatchObject({ lastRun: null, runCount: 0 });
  });

  it("summarises the latest run with its tier counts and counts every run", async () => {
    const config = await createConfig(clinicsInput);
    const other = await createConfig({ ...clinicsInput, name: "Fintech apps" });
    await storeRun(config.id, "run-older", "completed", "2026-11-01T10:00:00Z", "2026-11-01T10:00:04Z");
    await storeRun(config.id, "run-latest", "partial", "2026-11-02T10:00:00Z", "2026-11-02T10:00:06Z");
    await storeRun(other.id, "run-other", "completed", "2026-11-01T10:00:00Z", "2026-11-01T10:00:02Z");
    await storeLead("run-older", "https://boards.example.org/old", "strong");
    await storeLead("run-latest", "https://boards.example.org/a", "strong");
    await storeLead("run-latest", "https://boards.example.org/b", "weak");
    await storeLead("run-latest", "https://boards.example.org/c", "weak");

    const summary = await summaryOf(config.id);

    expect(summary?.runCount).toBe(2);
    expect(summary?.lastRun).toEqual({
      id: "run-latest",
      status: "partial",
      startedAt: new Date("2026-11-02T10:00:00Z"),
      finishedAt: new Date("2026-11-02T10:00:06Z"),
      tierCounts: { strong: 1, medium: 0, weak: 2 },
    });
    expect((await summaryOf(other.id))?.lastRun?.id).toBe("run-other");
  });

  it("breaks a tie between runs started at the same moment by the later id", async () => {
    const config = await createConfig(clinicsInput);
    await storeRun(config.id, "run-b", "completed", "2026-11-02T10:00:00Z", null);
    await storeRun(config.id, "run-a", "completed", "2026-11-02T10:00:00Z", null);

    expect((await summaryOf(config.id))?.lastRun?.id).toBe("run-b");
  });

  it("shows a run left running by a stopped server as failed", async () => {
    const config = await createConfig(clinicsInput);
    await storeRun(config.id, "run-orphaned", "running", "2026-11-02T10:00:00Z", null);

    expect((await summaryOf(config.id))?.lastRun?.status).toBe("failed");
  });
});
