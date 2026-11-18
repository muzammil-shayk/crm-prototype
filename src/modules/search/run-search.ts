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
  stats: RunStats;
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

const noStats = (): RunStats => ({
  queries: 0,
  queryFailures: 0,
  retrieved: 0,
  duplicates: 0,
  excluded: 0,
  outsideFilters: 0,
  outsideLocation: 0,
  outsideIndustry: 0,
  evaluated: 0,
  evaluationFailures: 0,
  costUnits: 0,
});

export async function runSearch(
  request: SearchRequest,
  deps: SearchDependencies,
  hooks: RunHooks,
): Promise<SearchOutcome> {
  const { config, organizations } = request;
  const budget = new CostBudget(deps.limits.maxCostUnits);
  const context: PipelineContext = { ...deps, budget, configHash: request.configHash, signal: hooks.signal };
  const limitsHit: LimitHit[] = [];
  const stats = noStats();
  const snapshot = (): RunStats => ({ ...stats, costUnits: budget.spent });
  const progressBetween = (stage: RunStage, from: number, to: number): ItemProgress => {
    hooks.onProgress({ stage, progress: from, stats: snapshot() });
    return (done, total) => {
      hooks.onProgress({
        stage,
        progress: Math.round(from + ((to - from) * done) / Math.max(total, 1)),
        stats: snapshot(),
      });
    };
  };
  hooks.signal.throwIfAborted();

  progressBetween("generating_queries", 0, 5);
  const { queries, truncated: tooManyQueries } = generateQueries(config, deps.limits.maxQueries);
  if (tooManyQueries) limitsHit.push("max_queries");
  stats.queries = queries.length;

  const retrieved = await retrieve(queries, context, progressBetween("retrieving", 5, 40));
  stats.queryFailures = retrieved.failures.length;
  stats.retrieved = retrieved.leads.length;

  progressBetween("filtering", 40, 45);
  const filtered = filterAndDedupe(retrieved.leads, config.criteria, deps.limits.maxLeads);
  if (filtered.truncated) limitsHit.push("max_leads");
  stats.duplicates = filtered.duplicates;
  stats.excluded = filtered.excluded;
  stats.outsideFilters = filtered.outsideFilters;
  stats.outsideLocation = filtered.outsideLocation;
  stats.outsideIndustry = filtered.outsideIndustry;

  const evaluationProgress = progressBetween("evaluating", 45, 95);
  const evaluated = await evaluate(
    filtered.leads,
    config,
    organizations,
    context,
    (done, total) => {
      stats.evaluated = done;
      evaluationProgress(done, total);
    },
    hooks.onLeadEvaluated,
  );
  stats.evaluated = evaluated.leads.length;
  stats.evaluationFailures = evaluated.failures.length;

  progressBetween("classifying", 95, 100);
  const leads = classify(evaluated.leads);
  if (budget.exhausted) limitsHit.push("max_cost_units");

  const warnings = [...retrieved.failures, ...evaluated.failures];
  const everyQueryFailed = queries.length > 0 && retrieved.failures.length === queries.length;
  const finalStats = snapshot();

  if (everyQueryFailed) {
    return { status: "failed", leads: [], stats: finalStats, limitsHit, warnings, error: ALL_QUERIES_FAILED };
  }
  const status = warnings.length > 0 || limitsHit.length > 0 ? "partial" : "completed";
  return { status, leads, stats: finalStats, limitsHit, warnings, error: null };
}
