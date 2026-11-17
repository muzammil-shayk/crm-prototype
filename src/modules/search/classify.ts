import { classifyLead, TIER_THRESHOLDS, TIERS } from "@/modules/classifier/classify-lead";
import type { ClassifiedLead, EvaluatedLead } from "./pipeline-types";

const NO_EVIDENCE_NOTE = "Marked Weak because no quoted passage from the post backs up the match.";

function explain(lead: EvaluatedLead): string {
  const forcedWeak = lead.evidence.length === 0 && lead.score >= TIER_THRESHOLDS.medium;
  return forcedWeak ? `${lead.explanation} ${NO_EVIDENCE_NOTE}` : lead.explanation;
}

export function classify(leads: readonly EvaluatedLead[]): ClassifiedLead[] {
  return leads
    .map((lead) => ({ ...lead, tier: classifyLead(lead), explanation: explain(lead) }))
    .sort(
      (a, b) =>
        TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier) ||
        b.score - a.score ||
        a.company.localeCompare(b.company) ||
        a.url.localeCompare(b.url),
    );
}
