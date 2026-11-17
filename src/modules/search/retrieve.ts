import { describeError, ProviderError } from "@/lib/errors";
import { parseJsonOrUndefined } from "@/lib/json";
import { callWithRetry, CostLimitReachedError } from "@/modules/providers/call-with-retry";
import type { RetrievedLead, SearchQuery } from "@/modules/providers/provider-types";
import { retrievedLeadsSchema } from "@/modules/providers/retrieved-lead-schema";
import type { CachedResult, ItemProgress, PipelineContext } from "./pipeline-types";

function readFresh(cached: CachedResult | undefined, ttlMs: number): RetrievedLead[] | undefined {
  if (!cached || Date.now() - cached.storedAt.getTime() > ttlMs) return undefined;
  const parsed = retrievedLeadsSchema.safeParse(parseJsonOrUndefined(cached.value));
  return parsed.success ? parsed.data : undefined;
}

async function runQuery(query: SearchQuery, context: PipelineContext): Promise<RetrievedLead[] | "skipped"> {
  const key = `search:${context.search.id}:${context.configHash}:${query.leadKind}:${query.text.toLowerCase()}`;
  const cached = readFresh(await context.cache.get(key), context.searchCacheTtlMs);
  if (cached) return cached;

  let response: unknown;
  try {
    response = await callWithRetry((signal) => context.search.search(query, signal), {
      ...context.retry,
      provider: "search",
      budget: context.budget,
      signal: context.signal,
    });
  } catch (error) {
    if (error instanceof CostLimitReachedError) return "skipped";
    throw error;
  }
  const leads = retrievedLeadsSchema.safeParse(response);
  if (!leads.success) throw new ProviderError("search", "returned leads in an unexpected shape");
  await context.cache.set(key, JSON.stringify(leads.data));
  return leads.data;
}

export async function retrieve(
  queries: readonly SearchQuery[],
  context: PipelineContext,
  onItem: ItemProgress = () => undefined,
): Promise<{ leads: RetrievedLead[]; failures: string[] }> {
  const leads: RetrievedLead[] = [];
  const failures: string[] = [];
  for (const [index, query] of queries.entries()) {
    context.signal.throwIfAborted();
    try {
      const found = await runQuery(query, context);
      if (found !== "skipped") leads.push(...found);
    } catch (error) {
      context.signal.throwIfAborted();
      failures.push(`Query "${query.text}": ${describeError(error)}`);
    }
    onItem(index + 1, queries.length);
  }
  return { leads, failures };
}
