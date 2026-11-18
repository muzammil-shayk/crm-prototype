import { db } from "@/lib/db";
import { TIERS, type Tier } from "@/lib/tiers";

export type TierCounts = Record<Tier, number>;

export const noLeads = (): TierCounts => ({ strong: 0, medium: 0, weak: 0 });

export async function tierCountsByRun(runIds: readonly string[]): Promise<Map<string, TierCounts>> {
  const counts = new Map(runIds.map((id) => [id, noLeads()]));
  if (runIds.length === 0) return counts;
  const groups = await db.lead.groupBy({
    by: ["runId", "tier"],
    where: { runId: { in: [...runIds] } },
    _count: { _all: true },
  });
  for (const group of groups) {
    const tier = TIERS.find((known) => known === group.tier);
    const runCounts = counts.get(group.runId);
    if (tier && runCounts) runCounts[tier] += group._count._all;
  }
  return counts;
}
