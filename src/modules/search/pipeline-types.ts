import type { Tier } from "@/modules/classifier/classify-lead";
import type { RetryOptions } from "@/modules/providers/call-with-retry";
import type { LlmProvider, RetrievedLead, SearchProvider } from "@/modules/providers/provider-types";
import type { CostBudget } from "./cost-budget";

export const RUN_STAGES = [
  "generating_queries",
  "retrieving",
  "filtering",
  "evaluating",
  "classifying",
] as const;
export type RunStage = (typeof RUN_STAGES)[number];

export type LimitHit = "max_queries" | "max_leads" | "max_cost_units";

export interface RunLimits {
  maxQueries: number;
  maxLeads: number;
  maxCostUnits: number;
}

export interface Evaluation {
  score: number;
  evidence: string[];
  explanation: string;
  matchedOrganizationId: string | null;
}

export interface EvaluatedLead extends RetrievedLead, Evaluation {
  evaluationError: string | null;
}

export interface ClassifiedLead extends EvaluatedLead {
  tier: Tier;
}

export interface RunStats {
  queries: number;
  queryFailures: number;
  retrieved: number;
  duplicates: number;
  excluded: number;
  outsideFilters: number;
  evaluated: number;
  evaluationFailures: number;
  costUnits: number;
}

export interface CachedResult {
  value: string;
  storedAt: Date;
}

export interface ResultCache {
  get(key: string): Promise<CachedResult | undefined>;
  set(key: string, value: string): Promise<void>;
}

export interface PipelineContext {
  search: SearchProvider;
  llm: LlmProvider;
  cache: ResultCache;
  searchCacheTtlMs: number;
  budget: CostBudget;
  configHash: string;
  retry: Omit<RetryOptions, "provider" | "signal" | "budget">;
  signal: AbortSignal;
}

export type ItemProgress = (done: number, total: number) => void;
