import { beforeEach, describe, expect, it, vi } from "vitest";
import { createConfig } from "@/modules/configs/config-service";
import { resetDatabase, seedOrganizations } from "../../../test/database";
import { dependencies, heldSearch, settled } from "../../../test/search-runs";
import { startSearch } from "./search-service";

const buyersInput = {
  type: "buyers-seeking-providers",
  name: "Clinics hiring an agency",
  criteria: { keywords: ["patient portal"] },
};

async function separateBundle() {
  vi.resetModules();
  return {
    configs: await import("@/modules/configs/config-service"),
    searches: await import("./search-service"),
  };
}

describe("runs shared between server bundles", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedOrganizations();
  });

  it("keeps a run started by the API running when the configs page lists configs", async () => {
    const config = await createConfig(buyersInput);
    const search = heldSearch();
    const run = await startSearch(config.id, dependencies(search));

    const page = await separateBundle();
    const [listed] = await page.configs.listConfigs();

    expect(listed?.lastRun).toMatchObject({ id: run.id, status: "running" });
    search.release();
    const { run: finished } = await settled(run.id);
    expect(finished.status).toBe("completed");
    expect(finished.tierCounts).toEqual({ strong: 0, medium: 0, weak: 3 });
  });

  it("starts only one run when two bundles start the same config at once", async () => {
    const config = await createConfig(buyersInput);
    const other = await separateBundle();

    const results = await Promise.allSettled([
      startSearch(config.id, dependencies()),
      other.searches.startSearch(config.id, dependencies()),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual(["fulfilled", "rejected"]);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected?.reason).toMatchObject({ code: "run_in_progress" });
    const fulfilled = results.find((result) => result.status === "fulfilled");
    if (fulfilled?.status === "fulfilled") await settled(fulfilled.value.id);
  });
});
