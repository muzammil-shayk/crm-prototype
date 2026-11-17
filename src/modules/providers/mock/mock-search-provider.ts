import { mentions } from "@/lib/text";
import type { RetrievedLead, SearchProvider, SearchQuery } from "../provider-types";
import { mockPostings } from "./mock-postings";

export class MockSearchProvider implements SearchProvider {
  readonly id = "mock-search";

  search(query: SearchQuery, _signal: AbortSignal): Promise<RetrievedLead[]> {
    const words = query.text.split(/\s+/).filter((word) => word.length > 0);
    const leads = mockPostings
      .filter((posting) => posting.kind === query.leadKind)
      .filter((posting) => words.every((word) => mentions(`${posting.title} ${posting.body}`, word)))
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .map(({ kind: _kind, ...lead }) => lead);
    return Promise.resolve(leads);
  }
}
