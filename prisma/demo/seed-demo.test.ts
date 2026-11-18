import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createConfig, getConfig, updateConfig } from "@/modules/configs/config-service";
import { resetDatabase } from "../../test/database";
import { seedDemoData } from "./seed-demo";

const userConfig = {
  type: "buyers-seeking-providers",
  name: "Our own search",
  criteria: { keywords: ["ERP rollout"] },
};

async function snapshot() {
  const [organizations, configs] = await Promise.all([
    db.organization.findMany({ orderBy: { name: "asc" } }),
    db.searchConfig.findMany({ orderBy: { name: "asc" } }),
  ]);
  return { organizations, configs };
}

describe("seedDemoData", () => {
  beforeEach(resetDatabase);

  it("loads ten organizations and six search configs into an empty database", async () => {
    await seedDemoData();

    expect(await db.organization.count()).toBe(10);
    expect(await db.searchConfig.count()).toBe(6);
  });

  it("changes nothing when it runs a second time", async () => {
    await seedDemoData();
    const first = await snapshot();

    await seedDemoData();

    expect(await snapshot()).toEqual(first);
  });

  it("keeps configs the user created and edits the user made to a seeded config", async () => {
    await seedDemoData();
    const mine = await createConfig(userConfig);
    const seeded = await db.searchConfig.findFirstOrThrow({
      where: { name: "Security audits for fintech and SaaS" },
    });
    const edited = await updateConfig(seeded.id, {
      type: "buyers-seeking-providers",
      name: seeded.name,
      criteria: { keywords: ["penetration test"] },
    });

    await seedDemoData();

    expect(await getConfig(mine.id)).toEqual(mine);
    expect(await getConfig(seeded.id)).toEqual(edited);
    expect(await db.searchConfig.count()).toBe(7);
  });
});
