import type { Lead, LeadStatus, Tier } from "@/api-client/types";
import { TIERS } from "@/lib/tiers";

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

export interface LeadPage {
  previous: string | null;
  next: string | null;
  position: number;
  total: number;
}

const ALL_LEADS: LeadFilter = { tier: "all", status: "all" };
const idsOf = (leads: readonly Lead[], filter: LeadFilter) =>
  groupLeads(leads, filter).groups.flatMap((group) => group.leads.map((lead) => lead.id));

export function leadPage(leads: readonly Lead[], filter: LeadFilter, currentId: string): LeadPage {
  const order = idsOf(leads, ALL_LEADS);
  const shown = idsOf(leads, filter);
  const at = order.indexOf(currentId);
  const nearest = (step: 1 | -1) => {
    if (at === -1) return null;
    for (let index = at + step; index >= 0 && index < order.length; index += step) {
      const id = order[index];
      if (id !== undefined && shown.includes(id)) return id;
    }
    return null;
  };
  return {
    previous: nearest(-1),
    next: nearest(1),
    position: shown.indexOf(currentId) + 1,
    total: shown.length,
  };
}
