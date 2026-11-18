import { mentions } from "@/lib/text";
import type { RetrievedLead, SearchProvider, SearchQuery } from "../provider-types";
import { simulateLatency } from "./mock-latency";
import { mockPostings, type MockPosting } from "./mock-postings";

export class MockSearchProvider implements SearchProvider {
  readonly id = "mock-search";

  constructor(
    private readonly delayMs = 0,
    private readonly postings: readonly MockPosting[] = mockPostings,
  ) {}

  async search(query: SearchQuery, signal: AbortSignal): Promise<RetrievedLead[]> {
    await simulateLatency(this.delayMs, signal);
    const words = query.text.split(/\s+/).filter((word) => word.length > 0);
    const leads = this.postings
      .filter((posting) => posting.kind === query.leadKind)
      .filter((posting) => words.every((word) => mentions(`${posting.title} ${posting.body}`, word)))
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .map(({ kind: _kind, ...lead }) => lead);
    return leads;
  }
}
