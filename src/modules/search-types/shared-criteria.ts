import { z } from "zod";
import { optionValues, type FieldDefinition, type FieldOption } from "./field-definition";

export const industryOptions: readonly FieldOption[] = [
  { value: "healthcare", label: "Healthcare" },
  { value: "fintech", label: "Financial services" },
  { value: "ecommerce", label: "E-commerce and retail" },
  { value: "logistics", label: "Logistics and supply chain" },
  { value: "education", label: "Education" },
  { value: "saas", label: "B2B software" },
  { value: "real-estate", label: "Real estate" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "hospitality", label: "Hospitality and travel" },
  { value: "nonprofit", label: "Nonprofit" },
];

function tagList(missingMessage?: string) {
  return z
    .array(z.string().trim().max(80, "Keep each entry under 80 characters"), { error: missingMessage })
    .max(25, "Use 25 entries or fewer")
    .transform((tags) => tags.filter((tag) => tag.length > 0));
}

export const requiredTagList = (message: string) =>
  tagList(message).pipe(z.array(z.string()).min(1, message));

export const sharedCriteriaShape = {
  keywords: requiredTagList("Add at least one keyword or phrase"),
  excludedKeywords: tagList().default([]),
  industries: z.array(z.enum(optionValues(industryOptions))).default([]),
  locations: tagList().default([]),
  rules: z.string().trim().max(2000, "Keep rules under 2,000 characters").default(""),
};

export const sharedFields: readonly FieldDefinition[] = [
  {
    key: "keywords",
    kind: "tags",
    label: "Keywords and phrases",
    help: "A lead must mention at least one of these. Use the words people actually write in a post.",
    placeholder: "e.g. looking for an agency",
    required: true,
  },
  {
    key: "excludedKeywords",
    kind: "tags",
    label: "Exclude leads that mention",
    help: "Any lead containing one of these is dropped before scoring.",
    placeholder: "e.g. internship",
    required: false,
  },
  {
    key: "industries",
    kind: "multiselect",
    label: "Target industries",
    help: "Leads from these industries score higher. Leave empty to accept any industry.",
    options: industryOptions,
    required: false,
  },
  {
    key: "locations",
    kind: "tags",
    label: "Locations",
    help: "Cities, countries or Remote. Leave empty to search everywhere.",
    placeholder: "e.g. London, Remote",
    required: false,
  },
  {
    key: "rules",
    kind: "textarea",
    label: "Qualification rules",
    help: "What makes a lead worth contacting. The evaluator reads these alongside the keywords.",
    placeholder: "Budget is stated. The person posting can sign off the work. Starts within three months.",
    required: false,
  },
];

export const configEnvelope = {
  name: z.string().trim().min(1, "Give the search a name").max(120, "Keep the name under 120 characters"),
  description: z.string().trim().max(4000, "Keep the description under 4,000 characters").default(""),
};
