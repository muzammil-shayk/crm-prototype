import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { resetDatabase } from "../../../test/database";
import {
  createConfig,
  deleteConfig,
  duplicateConfig,
  getConfig,
  listConfigs,
  updateConfig,
} from "./config-service";

const clinicsInput = {
  type: "buyers-seeking-providers",
  name: "Clinics replacing their patient portal",
  description: "Private clinic groups asking for an agency to rebuild booking.",
  criteria: { keywords: ["patient portal"], industries: ["healthcare"], minBudgetUsd: 20000 },
};

const missingId = "cm0missing00000000000000";

describe("config service", () => {
  beforeEach(resetDatabase);

  it("creates a config and fills in the optional criteria", async () => {
    const config = await createConfig(clinicsInput);

    expect(config).toMatchObject({
      type: "buyers-seeking-providers",
      name: "Clinics replacing their patient portal",
      criteria: {
        keywords: ["patient portal"],
        excludedKeywords: [],
        industries: ["healthcare"],
        locations: [],
        rules: "",
        minBudgetUsd: 20000,
      },
    });
    expect(await getConfig(config.id)).toEqual(config);
  });

  it("rejects an invalid config without saving it", async () => {
    await expect(createConfig({ ...clinicsInput, name: "" })).rejects.toBeInstanceOf(ZodError);
    expect(await listConfigs()).toEqual([]);
  });

  it("lists the most recently updated config first", async () => {
    const older = await createConfig(clinicsInput);
    const newer = await createConfig({ ...clinicsInput, name: "Fintech apps" });
    await updateConfig(older.id, { ...clinicsInput, name: "Clinics, edited" });

    expect((await listConfigs()).map((config) => config.id)).toEqual([older.id, newer.id]);
  });

  it("replaces a config on update", async () => {
    const config = await createConfig(clinicsInput);

    const updated = await updateConfig(config.id, {
      type: "jobs-for-our-organizations",
      name: "Data contracts",
      criteria: { keywords: ["data pipeline"], servicesToMatch: ["dbt"] },
    });

    expect(updated).toMatchObject({
      id: config.id,
      type: "jobs-for-our-organizations",
      name: "Data contracts",
    });
    expect(updated.criteria).not.toHaveProperty("minBudgetUsd");
  });

  it("duplicates a config under a new id with a copy suffix", async () => {
    const config = await createConfig(clinicsInput);

    const copy = await duplicateConfig(config.id);

    expect(copy.id).not.toBe(config.id);
    expect(copy.name).toBe("Clinics replacing their patient portal (copy)");
    expect(copy.criteria).toEqual(config.criteria);
  });

  it("keeps past search runs, with the config's name, when the config is deleted", async () => {
    const config = await createConfig(clinicsInput);
    const run = await db.searchRun.create({
      data: {
        configId: config.id,
        configName: config.name,
        configType: config.type,
        configHash: "h",
        status: "completed",
        stage: "classifying",
      },
    });

    await deleteConfig(config.id);

    await expect(getConfig(config.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await db.searchRun.findUnique({ where: { id: run.id } })).toMatchObject({
      configId: null,
      configName: "Clinics replacing their patient portal",
    });
  });

  it.each([
    ["get", () => getConfig(missingId)],
    ["update", () => updateConfig(missingId, clinicsInput)],
    ["delete", () => deleteConfig(missingId)],
    ["duplicate", () => duplicateConfig(missingId)],
  ])("reports a missing config on %s", async (_action, run) => {
    await expect(run()).rejects.toThrow(new NotFoundError("Search config", missingId));
  });

  it("leaves a stored config that no longer matches its type out of the list instead of failing it", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const broken = await createConfig(clinicsInput);
    const healthy = await createConfig({ ...clinicsInput, name: "Fintech apps" });
    await db.searchConfig.update({ where: { id: broken.id }, data: { criteria: "not json" } });

    expect((await listConfigs()).map((config) => config.id)).toEqual([healthy.id]);
  });

  it("refuses to serve a stored config that no longer matches its type", async () => {
    const config = await createConfig(clinicsInput);
    await db.searchConfig.update({ where: { id: config.id }, data: { criteria: '{"keywords":[]}' } });

    await expect(getConfig(config.id)).rejects.toThrow(
      `Stored search config ${config.id} no longer matches its search type.`,
    );
  });
});
