import type { OrganizationProfile } from "@/modules/providers/provider-types";
import type { SearchConfigInput } from "@/modules/search-types/registry";
import { classify } from "./classify";
import { CostBudget } from "./cost-budget";
import { evaluate } from "./evaluate";
import { filterAndDedupe } from "./filter-and-dedupe";
import { generateQueries } from "./generate-queries";
import type {
  ClassifiedLead,
  EvaluatedLead,
  ItemProgress,
  LimitHit,
  PipelineContext,
  RunLimits,
  RunStage,
  RunStats,
} from "./pipeline-types";
import { retrieve } from "./retrieve";

interface SearchRequest {
  config: SearchConfigInput;
  organizations: readonly OrganizationProfile[];
  configHash: string;
}

export type SearchDependencies = Pick<
  PipelineContext,
  "search" | "llm" | "cache" | "searchCacheTtlMs" | "retry"
> & {
  limits: RunLimits;
};

export interface RunProgress {
  stage: RunStage;
  progress: number;
}

export interface SearchOutcome {
  status: "completed" | "partial" | "failed";
  leads: ClassifiedLead[];
  stats: RunStats;
  limitsHit: LimitHit[];
  warnings: string[];
  error: string | null;
}

interface RunHooks {
  signal: AbortSignal;
  onProgress: (update: RunProgress) => void;
  onLeadEvaluated?: (lead: EvaluatedLead) => void;
}

const ALL_QUERIES_FAILED = "Every search query failed, so there were no leads to evaluate.";

function progressBetween(hooks: RunHooks, stage: RunStage, from: number, to: number): ItemProgress {
  hooks.onProgress({ stage, progress: from });
  return (done, total) => {
    hooks.onProgress({ stage, progress: Math.round(from + ((to - from) * done) / Math.max(total, 1)) });
  };
}

export async function runSearch(
  request: SearchRequest,
  deps: SearchDependencies,
  hooks: RunHooks,
): Promise<SearchOutcome> {
  const { config, organizations } = request;
  const budget = new CostBudget(deps.limits.maxCostUnits);
  const context: PipelineContext = { ...deps, budget, configHash: request.configHash, signal: hooks.signal };
  const limitsHit: LimitHit[] = [];
  hooks.signal.throwIfAborted();

  progressBetween(hooks, "generating_queries", 0, 5);
  const { queries, truncated: tooManyQueries } = generateQueries(config, deps.limits.maxQueries);
  if (tooManyQueries) limitsHit.push("max_queries");

  const retrieved = await retrieve(queries, context, progressBetween(hooks, "retrieving", 5, 40));

  progressBetween(hooks, "filtering", 40, 45);
  const filtered = filterAndDedupe(retrieved.leads, config.criteria, deps.limits.maxLeads);
  if (filtered.truncated) limitsHit.push("max_leads");

  const evaluated = await evaluate(
    filtered.leads,
    config,
    organizations,
    context,
    progressBetween(hooks, "evaluating", 45, 95),
    hooks.onLeadEvaluated,
  );

  progressBetween(hooks, "classifying", 95, 100);
  const leads = classify(evaluated.leads);
  if (budget.exhausted) limitsHit.push("max_cost_units");

  const warnings = [...retrieved.failures, ...evaluated.failures];
  const everyQueryFailed = queries.length > 0 && retrieved.failures.length === queries.length;
  const stats: RunStats = {
    queries: queries.length,
    queryFailures: retrieved.failures.length,
    retrieved: retrieved.leads.length,
    duplicates: filtered.duplicates,
    excluded: filtered.excluded,
    outsideFilters: filtered.outsideFilters,
    outsideLocation: filtered.outsideLocation,
    outsideIndustry: filtered.outsideIndustry,
    evaluated: evaluated.leads.length,
    evaluationFailures: evaluated.failures.length,
    costUnits: budget.spent,
  };

  if (everyQueryFailed) {
    return { status: "failed", leads: [], stats, limitsHit, warnings, error: ALL_QUERIES_FAILED };
  }
  const status = warnings.length > 0 || limitsHit.length > 0 ? "partial" : "completed";
  return { status, leads, stats, limitsHit, warnings, error: null };
}
