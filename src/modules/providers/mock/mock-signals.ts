import { formatUsd, joinAsList, mentions } from "@/lib/text";
import { industryOptions } from "@/modules/search-types/shared-criteria";
import { matchesLocation } from "@/modules/search/target-filters";
import type { OrganizationProfile, RetrievedLead } from "../provider-types";

export interface Signal {
  points: number;
  reason: string;
}

const POINTS_PER_TERM = 20;
const MAX_TERM_POINTS = 50;

const fullText = (lead: RetrievedLead) => `${lead.title} ${lead.body}`;

export function termSignal(lead: RetrievedLead, terms: readonly string[]): Signal {
  const found = terms.filter((term) => mentions(fullText(lead), term));
  if (found.length === 0) return { points: 0, reason: "Does not mention any of the keywords." };
  const points = Math.min(found.length * POINTS_PER_TERM, MAX_TERM_POINTS);
  return { points, reason: `Mentions ${joinAsList(found.map((term) => `"${term}"`))}.` };
}

export function industrySignal(lead: RetrievedLead, industries: readonly string[]): Signal | null {
  if (industries.length === 0) return null;
  const label = industryOptions.find((option) => option.value === lead.industry)?.label ?? lead.industry;
  return industries.includes(lead.industry)
    ? { points: 15, reason: `${label} is a target industry.` }
    : { points: 0, reason: `${label} is outside the target industries.` };
}

export function locationSignal(lead: RetrievedLead, locations: readonly string[]): Signal | null {
  if (locations.length === 0) return null;
  return matchesLocation(lead.location, locations)
    ? { points: 15, reason: `${lead.location} matches the target locations.` }
    : { points: 0, reason: `${lead.location} is outside the target locations.` };
}

export function budgetSignal(lead: RetrievedLead, minBudgetUsd: number | undefined): Signal | null {
  if (minBudgetUsd === undefined) return null;
  if (lead.budgetUsd === undefined) return { points: 0, reason: "No budget is stated." };
  const stated = `Budget of ${formatUsd(lead.budgetUsd)}`;
  return lead.budgetUsd >= minBudgetUsd
    ? { points: 20, reason: `${stated} meets the ${formatUsd(minBudgetUsd)} minimum.` }
    : { points: -15, reason: `${stated} is below the ${formatUsd(minBudgetUsd)} minimum.` };
}

export function engagementSignal(lead: RetrievedLead, engagementTypes: readonly string[]): Signal | null {
  if (engagementTypes.length === 0 || lead.engagementType === undefined) return null;
  return engagementTypes.includes(lead.engagementType)
    ? { points: 10, reason: `Offered as ${lead.engagementType}, a preferred engagement type.` }
    : { points: 0, reason: `Offered as ${lead.engagementType}, which is not a preferred engagement type.` };
}

export function organizationSignal(
  lead: RetrievedLead,
  services: readonly string[],
  organizations: readonly OrganizationProfile[],
): Signal & { organizationId: string | null } {
  let best: { organization: OrganizationProfile; covered: string[] } | null = null;
  for (const organization of organizations) {
    const offered = new Set(organization.services.map((service) => service.toLowerCase()));
    const covered = services.filter(
      (service) => offered.has(service.toLowerCase()) && mentions(fullText(lead), service),
    );
    if (covered.length > (best?.covered.length ?? 0)) best = { organization, covered };
  }
  if (!best) {
    return {
      points: 0,
      reason: "No registered organization covers the services mentioned.",
      organizationId: null,
    };
  }
  return {
    points: 10,
    reason: `${best.organization.name} covers ${joinAsList(best.covered)}.`,
    organizationId: best.organization.id,
  };
}
