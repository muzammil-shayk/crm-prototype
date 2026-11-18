import { mentions } from "@/lib/text";
import type { RetrievedLead } from "@/modules/providers/provider-types";
import { matchesIndustry, matchesLocation } from "./target-filters";

interface LeadFilters {
  excludedKeywords: readonly string[];
  industries: readonly string[];
  locations: readonly string[];
}

function canonicalUrl(url: string): string {
  if (!URL.canParse(url)) return url.trim();
  const parsed = new URL(url);
  parsed.hash = "";
  return parsed.href.replace(/\/+$/, "");
}

export function filterAndDedupe(
  leads: RetrievedLead[],
  { excludedKeywords, industries, locations }: LeadFilters,
  maxLeads: number,
) {
  const seen = new Set<string>();
  const kept: RetrievedLead[] = [];
  let duplicates = 0;
  let excluded = 0;
  let outsideLocation = 0;
  let outsideIndustry = 0;
  for (const lead of leads) {
    const key = canonicalUrl(lead.url);
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);
    const text = `${lead.title}\n${lead.body}`;
    if (excludedKeywords.some((keyword) => mentions(text, keyword))) {
      excluded += 1;
      continue;
    }
    if (!matchesLocation(lead.location, locations)) {
      outsideLocation += 1;
      continue;
    }
    if (!matchesIndustry(lead.industry, industries)) {
      outsideIndustry += 1;
      continue;
    }
    kept.push(lead);
  }
  return {
    leads: kept.slice(0, maxLeads),
    duplicates,
    excluded,
    outsideLocation,
    outsideIndustry,
    outsideFilters: outsideLocation + outsideIndustry,
    truncated: kept.length > maxLeads,
  };
}
