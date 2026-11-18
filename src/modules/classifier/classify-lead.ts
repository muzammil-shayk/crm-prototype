import { TIER_THRESHOLDS, type Tier } from "@/lib/tiers";

export { TIER_THRESHOLDS, TIERS, type Tier } from "@/lib/tiers";

export function classifyLead(lead: { score: number; evidence: readonly string[] }): Tier {
  const hasEvidence = lead.evidence.some((quote) => quote.trim().length > 0);
  if (!hasEvidence) return "weak";
  if (lead.score >= TIER_THRESHOLDS.strong) return "strong";
  if (lead.score >= TIER_THRESHOLDS.medium) return "medium";
  return "weak";
}
