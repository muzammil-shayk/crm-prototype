import { db } from "@/lib/db";
import type { ResultCache } from "./pipeline-types";

export const prismaResultCache: ResultCache = {
  async get(key) {
    const entry = await db.cacheEntry.findUnique({ where: { key } });
    return entry ? { value: entry.value, storedAt: entry.createdAt } : undefined;
  },
  async set(key, value) {
    await db.cacheEntry.upsert({
      where: { key },
      create: { key, value },
      update: { value, createdAt: new Date() },
    });
  },
};
