import type { Lead, Tier } from "@/api-client/types";
import { TIER_LABEL } from "@/components/search/run-labels";
import { TIER_THRESHOLDS } from "@/lib/tiers";

type Scored = Pick<Lead, "score" | "tier" | "evidence">;

const lacksQuote = (lead: Scored) =>
  lead.tier === "weak" && lead.evidence.every((quote) => quote.trim() === "");

function tierByScore(score: number): Tier {
  if (score >= TIER_THRESHOLDS.strong) return "strong";
  return score >= TIER_THRESHOLDS.medium ? "medium" : "weak";
}

export function noQuoteReason(lead: Scored): string | null {
  if (!lacksQuote(lead)) return null;
  return tierByScore(lead.score) === "weak"
    ? "No quote from the post backs the match."
    : `Scored ${lead.score} but kept Weak: no quote from the post backs the match.`;
}

export function noQuoteVerdict(lead: Scored): string | null {
  const byScore = tierByScore(lead.score);
  if (!lacksQuote(lead) || byScore === "weak") return null;
  return `Scored ${lead.score}, enough for ${TIER_LABEL[byScore]}, but nothing in the post could be quoted in support, so it stays Weak.`;
}
