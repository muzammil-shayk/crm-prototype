import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { resetDatabase } from "../../../test/database";
import { prismaResultCache } from "./prisma-result-cache";

describe("prismaResultCache", () => {
  beforeEach(resetDatabase);

  it("returns undefined for a key it has never stored", async () => {
    expect(await prismaResultCache.get("search:h:buyer:dbt")).toBeUndefined();
  });

  it("stores a value and overwrites it on a second write", async () => {
    await prismaResultCache.set("search:h:buyer:dbt", "[]");
    await prismaResultCache.set("search:h:buyer:dbt", '[{"url":"x"}]');

    expect((await prismaResultCache.get("search:h:buyer:dbt"))?.value).toBe('[{"url":"x"}]');
  });

  it("restarts the age of an entry when it is overwritten", async () => {
    await prismaResultCache.set("search:h:buyer:dbt", "[]");
    const longAgo = new Date("2026-01-01T00:00:00.000Z");
    await db.cacheEntry.update({ where: { key: "search:h:buyer:dbt" }, data: { createdAt: longAgo } });

    await prismaResultCache.set("search:h:buyer:dbt", "[]");

    const storedAt = (await prismaResultCache.get("search:h:buyer:dbt"))?.storedAt;
    expect(storedAt?.getTime()).toBeGreaterThan(Date.now() - 60_000);
  });
});
