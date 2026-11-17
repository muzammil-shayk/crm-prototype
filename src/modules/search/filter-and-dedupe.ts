import { mentions } from "@/lib/text";
import type { RetrievedLead } from "@/modules/providers/provider-types";

function canonicalUrl(url: string): string {
  if (!URL.canParse(url)) return url.trim();
  const parsed = new URL(url);
  parsed.hash = "";
  return parsed.href.replace(/\/+$/, "");
}

export function filterAndDedupe(
  leads: RetrievedLead[],
  excludedKeywords: readonly string[],
  maxLeads: number,
) {
  const seen = new Set<string>();
  const kept: RetrievedLead[] = [];
  let duplicates = 0;
  let excluded = 0;
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
    kept.push(lead);
  }
  return { leads: kept.slice(0, maxLeads), duplicates, excluded, truncated: kept.length > maxLeads };
}
