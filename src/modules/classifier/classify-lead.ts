export const TIERS = ["strong", "medium", "weak"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_THRESHOLDS = { strong: 70, medium: 40 } as const;

export function classifyLead(lead: { score: number; evidence: readonly string[] }): Tier {
  const hasEvidence = lead.evidence.some((quote) => quote.trim().length > 0);
  if (!hasEvidence) return "weak";
  if (lead.score >= TIER_THRESHOLDS.strong) return "strong";
  if (lead.score >= TIER_THRESHOLDS.medium) return "medium";
  return "weak";
}
