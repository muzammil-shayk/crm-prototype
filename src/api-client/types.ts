import type { Tier } from "@/modules/classifier/classify-lead";
import type { SearchConfig as StoredSearchConfig } from "@/modules/configs/config-service";
import type { Lead as StoredLead } from "@/modules/leads/lead-repository";
import type { LeadStatus } from "@/modules/leads/lead-status";
import type { LimitHit, RunStage, RunStats } from "@/modules/search/pipeline-types";
import type { RunStatus, SearchRun as StoredSearchRun } from "@/modules/search/search-run-repository";
import type { FieldDefinition, FieldOption } from "@/modules/search-types/field-definition";
import type { SearchTypeId } from "@/modules/search-types/registry";

type Json<T> = T extends Date
  ? string
  : T extends readonly (infer Item)[]
    ? Json<Item>[]
    : T extends object
      ? { [Key in keyof T]: Json<T[Key]> }
      : T;

export type SearchConfig = Json<StoredSearchConfig>;
export type SearchRun = Json<StoredSearchRun>;
export type Lead = Json<StoredLead>;

export interface SearchConfigDraft {
  type: SearchTypeId;
  name: string;
  description: string;
  criteria: Record<string, unknown>;
}

export interface SearchType {
  id: SearchTypeId;
  label: string;
  description: string;
  fields: FieldDefinition[];
}

export type {
  FieldDefinition,
  FieldOption,
  LeadStatus,
  LimitHit,
  RunStage,
  RunStats,
  RunStatus,
  SearchTypeId,
  Tier,
};
