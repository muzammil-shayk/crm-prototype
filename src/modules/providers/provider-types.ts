import type { LeadKind } from "@/modules/search-types/search-type";
import type { SearchConfigInput } from "@/modules/search-types/registry";

export interface SearchQuery {
  text: string;
  leadKind: LeadKind;
}

export interface RetrievedLead {
  url: string;
  title: string;
  source: string;
  company: string;
  location: string;
  industry: string;
  publishedAt: string;
  body: string;
  budgetUsd?: number;
  engagementType?: string;
}

export interface OrganizationProfile {
  id: string;
  name: string;
  services: readonly string[];
}

export interface EvaluationRequest {
  lead: RetrievedLead;
  config: SearchConfigInput;
  organizations: readonly OrganizationProfile[];
}

export interface SearchProvider {
  readonly id: string;
  search(query: SearchQuery, signal: AbortSignal): Promise<RetrievedLead[]>;
}

export interface LlmProvider {
  readonly id: string;
  evaluateLead(request: EvaluationRequest, signal: AbortSignal): Promise<string>;
}
