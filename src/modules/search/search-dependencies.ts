import { createProviders } from "@/modules/providers/create-providers";
import { prismaResultCache } from "./prisma-result-cache";
import type { SearchDependencies } from "./run-search";

const RUN_LIMITS = { maxQueries: 8, maxLeads: 25, maxCostUnits: 60 } as const;

export function defaultSearchDependencies(): SearchDependencies {
  return {
    ...createProviders(process.env),
    cache: prismaResultCache,
    searchCacheTtlMs: 6 * 60 * 60 * 1000,
    limits: RUN_LIMITS,
    retry: { attempts: 3, timeoutMs: 15_000, backoffMs: 500 },
  };
}
