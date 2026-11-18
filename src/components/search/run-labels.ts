import { TIER_THRESHOLDS } from "@/lib/tiers";
import type { LeadStatus, LimitHit, RunStage, RunStatus, Tier } from "@/api-client/types";

export const STAGES: readonly { id: RunStage; label: string }[] = [
  { id: "generating_queries", label: "Writing queries" },
  { id: "retrieving", label: "Fetching posts" },
  { id: "filtering", label: "Removing duplicates" },
  { id: "evaluating", label: "Scoring leads" },
  { id: "classifying", label: "Sorting into tiers" },
];

export const STATUS_LABEL: Record<RunStatus, string> = {
  running: "Running",
  completed: "Completed",
  partial: "Partial",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const LIMIT_EXPLANATION: Record<LimitHit, string> = {
  max_queries:
    "The run reached its query limit, so some keywords were not searched. Split the config to cover them all.",
  max_leads:
    "More posts matched than one run scores, so only the first batch was evaluated. Narrow the keywords or add exclusions.",
  max_cost_units:
    "The run used its whole provider budget, so some posts were not scored. Run it again later to reuse the cached results.",
};

export const TIER_LABEL: Record<Tier, string> = { strong: "Strong", medium: "Medium", weak: "Weak" };

const { strong, medium } = TIER_THRESHOLDS;

export const TIER_MEANING: Record<Tier, string> = {
  strong: `Score ${strong} or more, backed by a quote from the post.`,
  medium: `Score ${medium} to ${strong - 1}, backed by a quote from the post.`,
  weak: `Score under ${medium}, or nothing in the post to quote.`,
};

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  dismissed: "Dismissed",
};

export const LEAD_STATUSES = ["new", "contacted", "dismissed"] as const satisfies readonly LeadStatus[];
