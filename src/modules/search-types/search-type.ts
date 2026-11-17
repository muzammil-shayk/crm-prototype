import type { z } from "zod";
import type { FieldDefinition } from "./field-definition";

export type LeadKind = "buyer" | "job";

export interface SearchTypeDefinition {
  id: string;
  label: string;
  description: string;
  leadKind: LeadKind;
  queryFields: readonly string[];
  fields: readonly FieldDefinition[];
  criteriaSchema: z.ZodObject<Record<string, z.ZodType>, z.core.$strict>;
  configSchema: z.ZodObject<z.core.$ZodLooseShape, z.core.$strict>;
}
