import type { Lead, LeadStatus, Tier } from "@/api-client/types";
import { TIERS } from "@/modules/classifier/classify-lead";

export interface LeadFilter {
  tier: Tier | "all";
  status: LeadStatus | "all";
}

export interface LeadGroup {
  tier: Tier;
  leads: Lead[];
}

export function groupLeads(leads: readonly Lead[], filter: LeadFilter) {
  const byStatus = leads.filter((lead) => filter.status === "all" || lead.status === filter.status);
  const count = (tier: Tier) => byStatus.filter((lead) => lead.tier === tier).length;
  const tierCounts: Record<Tier, number> = {
    strong: count("strong"),
    medium: count("medium"),
    weak: count("weak"),
  };
  const groups: LeadGroup[] = TIERS.filter((tier) => filter.tier === "all" || filter.tier === tier)
    .map((tier) => ({ tier, leads: byStatus.filter((lead) => lead.tier === tier) }))
    .filter((group) => group.leads.length > 0);
  return { groups, tierCounts, total: byStatus.length };
}
