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
    evaluated: 1,
    evaluationFailures: 0,
    costUnits: 2,
  },
  limitsHit: [],
  warnings: [],
  error: null,
};

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
