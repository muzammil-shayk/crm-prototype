import { z } from "zod";
import { optionValues, type FieldDefinition, type FieldOption } from "./field-definition";
import { configEnvelope, requiredTagList, sharedCriteriaShape, sharedFields } from "./shared-criteria";
import type { SearchTypeDefinition } from "./search-type";

const engagementOptions: readonly FieldOption[] = [
  { value: "fixed-price", label: "Fixed-price project" },
  { value: "hourly", label: "Hourly contract" },
  { value: "retainer", label: "Monthly retainer" },
  { value: "tender", label: "Public tender" },
];

const criteriaSchema = z.strictObject({
  ...sharedCriteriaShape,
  servicesToMatch: requiredTagList("Add at least one service our organizations deliver"),
  engagementTypes: z.array(z.enum(optionValues(engagementOptions))).default([]),
});

const fields: readonly FieldDefinition[] = [
  ...sharedFields,
  {
    key: "servicesToMatch",
    kind: "tags",
    label: "Organization services to match",
    help: "Services our registered organizations deliver. Each job is matched to the organization that covers it best.",
    placeholder: "e.g. data engineering",
    required: true,
  },
  {
    key: "engagementTypes",
    kind: "multiselect",
    label: "Engagement types",
    help: "Jobs offered on these terms score higher. Leave empty to accept any.",
    options: engagementOptions,
    required: false,
  },
];

export const jobsForOurOrganizations = {
  id: "jobs-for-our-organizations",
  label: "Jobs matching our organizations",
  description: "Find jobs, contracts and tenders that one of our registered organizations could deliver.",
  leadKind: "job",
  queryFields: ["keywords", "servicesToMatch"] as const,
  fields,
  criteriaSchema,
  configSchema: z.strictObject({
    type: z.literal("jobs-for-our-organizations"),
    ...configEnvelope,
    criteria: criteriaSchema,
  }),
} satisfies SearchTypeDefinition;
