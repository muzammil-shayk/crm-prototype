import type { SearchQuery } from "@/modules/providers/provider-types";
import { definitionOf, queryTermsOf, type SearchConfigInput } from "@/modules/search-types/registry";

export function generateQueries(
  config: SearchConfigInput,
  maxQueries: number,
): { queries: SearchQuery[]; truncated: boolean } {
  const { leadKind } = definitionOf(config.type);
  const seen = new Set<string>();
  const queries: SearchQuery[] = [];
  for (const term of queryTermsOf(config)) {
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    queries.push({ text: term, leadKind });
  }
  return { queries: queries.slice(0, maxQueries), truncated: queries.length > maxQueries };
}
