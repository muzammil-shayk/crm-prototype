import { describeError } from "@/lib/errors";
import { stableHash } from "@/lib/stable-hash";
import { callWithRetry, CostLimitReachedError } from "@/modules/providers/call-with-retry";
import type { OrganizationProfile, RetrievedLead } from "@/modules/providers/provider-types";
import type { SearchConfigInput } from "@/modules/search-types/registry";
import { fallbackEvaluation, parseEvaluation } from "./parse-evaluation";
import type { EvaluatedLead, Evaluation, ItemProgress, PipelineContext } from "./pipeline-types";

const COST_LIMIT_REASON = "Not evaluated: the run reached its cost limit.";

interface LeadVerdict {
  evaluation: Evaluation;
  error: string | null;
  failed: boolean;
}

async function judgeLead(
  lead: RetrievedLead,
  config: SearchConfigInput,
  organizations: readonly OrganizationProfile[],
  context: PipelineContext,
): Promise<LeadVerdict> {
  const organizationIds = new Set(organizations.map((organization) => organization.id));
  const leadDigest = stableHash({ url: lead.url, title: lead.title, body: lead.body });
  const key = `evaluation-v2:${context.llm.id}:${context.configHash}:${stableHash(organizations)}:${leadDigest}`;
  const cached = await context.cache.get(key);
  if (cached) {
    const parsed = parseEvaluation(cached.value, lead, organizationIds);
    if (parsed.error === null) return { ...parsed, failed: false };
  }
  try {
    const raw = await callWithRetry(
      (signal) => context.llm.evaluateLead({ lead, config, organizations }, signal),
      { ...context.retry, provider: "llm", budget: context.budget, signal: context.signal },
    );
    const parsed = parseEvaluation(raw, lead, organizationIds);
    if (parsed.error === null) await context.cache.set(key, raw);
    return { ...parsed, failed: parsed.error !== null };
  } catch (error) {
    context.signal.throwIfAborted();
    if (error instanceof CostLimitReachedError) {
      return { evaluation: fallbackEvaluation(COST_LIMIT_REASON), error: COST_LIMIT_REASON, failed: false };
    }
    return { evaluation: fallbackEvaluation(), error: describeError(error), failed: true };
  }
}

export async function evaluate(
  leads: readonly RetrievedLead[],
  config: SearchConfigInput,
  organizations: readonly OrganizationProfile[],
  context: PipelineContext,
  onItem: ItemProgress = () => undefined,
  onLead: (lead: EvaluatedLead) => void = () => undefined,
): Promise<{ leads: EvaluatedLead[]; failures: string[] }> {
  const evaluated: EvaluatedLead[] = [];
  const failures: string[] = [];
  for (const [index, lead] of leads.entries()) {
    context.signal.throwIfAborted();
    const verdict = await judgeLead(lead, config, organizations, context);
    const evaluatedLead = { ...lead, ...verdict.evaluation, evaluationError: verdict.error };
    evaluated.push(evaluatedLead);
    onLead(evaluatedLead);
    if (verdict.failed) failures.push(`Lead "${lead.company}": ${verdict.error ?? "unknown error"}`);
    onItem(index + 1, leads.length);
  }
  return { leads: evaluated, failures };
}
