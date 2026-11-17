import { beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import type { ClassifiedLead } from "@/modules/search/pipeline-types";
import { resetDatabase, seedOrganizations } from "../../../test/database";
import { retrievedLead } from "../../../test/retrieved-lead";
import { leadRowsFor } from "./lead-repository";
import { listLeads, setLeadStatus } from "./lead-service";

function classified(overrides: Partial<ClassifiedLead>): ClassifiedLead {
  return {
    ...retrievedLead(),
    score: 80,
    evidence: ["We are looking for an agency to rebuild our patient portal."],
    explanation: "Mentions the patient portal.",
    matchedOrganizationId: null,
    evaluationError: null,
    tier: "strong",
    ...overrides,
  };
}

async function storeRun(leads: ClassifiedLead[]) {
  const run = await db.searchRun.create({
    data: {
      configName: "Clinics",
      configType: "buyers-seeking-providers",
      configHash: "h",
      status: "completed",
      stage: "classifying",
    },
  });
  await db.lead.createMany({ data: leadRowsFor(run.id, leads) });
  return run.id;
}

describe("lead service", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedOrganizations();
  });

  it("returns stored leads with their evidence list and matched organization", async () => {
    const runId = await storeRun([
      classified({ url: "https://a.example/1", matchedOrganizationId: "cm0northwind000000000000" }),
    ]);

    const [lead] = await listLeads({ runId });

    expect(lead).toMatchObject({
      runId,
      company: "Harbourside Dental Group",
      tier: "strong",
      status: "new",
      evidence: ["We are looking for an agency to rebuild our patient portal."],
      matchedOrganization: { id: "cm0northwind000000000000", name: "Northwind Data Studio" },
      budgetUsd: null,
    });
  });

  it("filters by status and tier, strongest first", async () => {
    const runId = await storeRun([
      classified({ url: "https://a.example/weak", tier: "weak", score: 10 }),
      classified({ url: "https://a.example/strong", tier: "strong", score: 75 }),
      classified({ url: "https://a.example/medium", tier: "medium", score: 50 }),
    ]);
    const weak = (await listLeads({ runId, tier: "weak" }))[0];
    if (!weak) throw new Error("expected a weak lead");
    await setLeadStatus(weak.id, { status: "dismissed" });

    expect((await listLeads({ runId, status: "new" })).map((lead) => lead.tier)).toEqual([
      "strong",
      "medium",
    ]);
    expect((await listLeads({ status: "dismissed" })).map((lead) => lead.url)).toEqual([
      "https://a.example/weak",
    ]);
  });

  it("breaks score ties by company name", async () => {
    const runId = await storeRun([
      classified({ url: "https://a.example/z", company: "Zephyr Labs", score: 80 }),
      classified({ url: "https://a.example/a", company: "Acme Clinics", score: 80 }),
      classified({ url: "https://a.example/m", company: "Moorland Health", score: 80 }),
    ]);

    expect((await listLeads({ runId })).map((lead) => lead.company)).toEqual([
      "Acme Clinics",
      "Moorland Health",
      "Zephyr Labs",
    ]);
  });

  it("returns at most `limit` leads, strongest first", async () => {
    const runId = await storeRun([
      classified({ url: "https://a.example/weak", tier: "weak", score: 95 }),
      classified({ url: "https://a.example/strong", tier: "strong", score: 75 }),
      classified({ url: "https://a.example/medium", tier: "medium", score: 50 }),
    ]);

    expect((await listLeads({ runId, limit: "2" })).map((lead) => lead.tier)).toEqual(["strong", "medium"]);
  });

  it("caps an unlimited request at 100 leads", async () => {
    const many = Array.from({ length: 101 }, (_, n) => classified({ url: `https://a.example/${n}` }));
    const runId = await storeRun(many);

    expect(await listLeads({ runId })).toHaveLength(100);
  });

  it.each(["0", "501", "ten"])("rejects a limit of %s", async (limit) => {
    await expect(listLeads({ limit })).rejects.toBeInstanceOf(ZodError);
  });

  it("rejects an unknown status filter", async () => {
    await expect(listLeads({ status: "won" })).rejects.toBeInstanceOf(ZodError);
  });

  it("moves a lead to contacted", async () => {
    const runId = await storeRun([classified({})]);
    const [lead] = await listLeads({ runId });
    if (!lead) throw new Error("expected a lead");

    expect((await setLeadStatus(lead.id, { status: "contacted" })).status).toBe("contacted");
  });

  it("rejects a status that does not exist", async () => {
    const runId = await storeRun([classified({})]);
    const [lead] = await listLeads({ runId });
    if (!lead) throw new Error("expected a lead");

    await expect(setLeadStatus(lead.id, { status: "archived" })).rejects.toBeInstanceOf(ZodError);
  });

  it("reports a missing lead", async () => {
    await expect(setLeadStatus("cm0missing00000000000000", { status: "contacted" })).rejects.toThrow(
      new NotFoundError("Lead", "cm0missing00000000000000"),
    );
  });
});
