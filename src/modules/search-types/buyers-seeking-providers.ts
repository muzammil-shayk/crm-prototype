import { z } from "zod";
import type { FieldDefinition } from "./field-definition";
import { configEnvelope, sharedCriteriaShape, sharedFields } from "./shared-criteria";
import type { SearchTypeDefinition } from "./search-type";

const criteriaSchema = z.strictObject({
  ...sharedCriteriaShape,
  minBudgetUsd: z.number().int().min(0, "Budget cannot be negative").optional(),
});

const fields: readonly FieldDefinition[] = [
  ...sharedFields,
  {
    key: "minBudgetUsd",
    kind: "number",
    label: "Minimum budget (USD)",
    help: "Leads that state a lower budget score lower. Leads with no budget are not penalised.",
    placeholder: "e.g. 15000",
    min: 0,
    required: false,
  },
];

export const buyersSeekingProviders = {
  id: "buyers-seeking-providers",
  label: "Organizations looking for providers",
  description: "Find companies asking to hire an agency, consultancy or contractor for work we offer.",
  leadKind: "buyer",
  queryFields: ["keywords"] as const,
  fields,
  criteriaSchema,
  configSchema: z.strictObject({
    type: z.literal("buyers-seeking-providers"),
    ...configEnvelope,
    criteria: criteriaSchema,
  }),
} satisfies SearchTypeDefinition;
