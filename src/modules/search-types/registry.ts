import { z } from "zod";
import { buyersSeekingProviders } from "./buyers-seeking-providers";
import { jobsForOurOrganizations } from "./jobs-for-our-organizations";
import type { SearchTypeDefinition } from "./search-type";

export const searchTypes = [buyersSeekingProviders, jobsForOurOrganizations] as const;

export type SearchTypeId = (typeof searchTypes)[number]["id"];

export const searchConfigInputSchema = z.discriminatedUnion(
  "type",
  [buyersSeekingProviders.configSchema, jobsForOurOrganizations.configSchema],
  { error: () => `Search type must be one of: ${searchTypes.map((type) => type.id).join(", ")}` },
);

export type SearchConfigInput = z.infer<typeof searchConfigInputSchema>;

export function getSearchType(id: string): SearchTypeDefinition | undefined {
  return searchTypes.find((type) => type.id === id);
}

export function definitionOf(type: SearchTypeId): SearchTypeDefinition {
  const definition = getSearchType(type);
  if (!definition) throw new Error(`Search type ${type} is not registered.`);
  return definition;
}

function termsOf<Field extends string>(
  criteria: Readonly<Record<Field, readonly string[]>>,
  fields: readonly Field[],
): string[] {
  return fields.flatMap((field) => criteria[field]);
}

export function queryTermsOf(config: SearchConfigInput): string[] {
  switch (config.type) {
    case "buyers-seeking-providers":
      return termsOf(config.criteria, buyersSeekingProviders.queryFields);
    case "jobs-for-our-organizations":
      return termsOf(config.criteria, jobsForOurOrganizations.queryFields);
  }
}

export function parseSearchConfigInput(input: unknown): SearchConfigInput {
  return searchConfigInputSchema.parse(input);
}

export function toPublicSearchType({ id, label, description, fields }: SearchTypeDefinition) {
  return { id, label, description, fields };
}
