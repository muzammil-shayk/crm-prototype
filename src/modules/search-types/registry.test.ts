import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import type { SearchTypeDefinition } from "./search-type";
import {
  getSearchType,
  parseSearchConfigInput,
  searchConfigInputSchema,
  searchTypes,
  toPublicSearchType,
} from "./registry";

const buyersInput = {
  type: "buyers-seeking-providers",
  name: "Clinics replacing their patient portal",
  description: "Private clinic groups in the UK asking for an agency to rebuild patient booking.",
  criteria: {
    keywords: ["patient portal", "looking for an agency"],
    excludedKeywords: [],
    industries: ["healthcare"],
    locations: ["United Kingdom"],
    rules: "Budget stated or decision maker posting.",
    minBudgetUsd: 20000,
  },
};

const jobsInput = {
  type: "jobs-for-our-organizations",
  name: "Data engineering contracts",
  description: "Contracts our data teams can deliver remotely.",
  criteria: {
    keywords: ["data pipeline"],
    excludedKeywords: ["internship"],
    industries: [],
    locations: ["Remote"],
    rules: "",
    servicesToMatch: ["data engineering", "dbt"],
    engagementTypes: ["fixed-price"],
  },
};

function issuePaths(run: () => unknown): string[] {
  try {
    run();
  } catch (error) {
    if (error instanceof ZodError) return error.issues.map((issue) => issue.path.join("."));
    throw error;
  }
  return [];
}

describe("search type registry", () => {
  it("registers both search types with unique ids", () => {
    const ids = searchTypes.map((type) => type.id);
    expect(ids).toEqual(["buyers-seeking-providers", "jobs-for-our-organizations"]);
  });

  it("looks a type up by id and returns undefined for unknown ids", () => {
    expect(getSearchType("jobs-for-our-organizations")?.leadKind).toBe("job");
    expect(getSearchType("nope")).toBeUndefined();
  });

  it("gives each type its own fields", () => {
    const keys = (id: string) => getSearchType(id)?.fields.map((field) => field.key) ?? [];
    expect(keys("jobs-for-our-organizations")).toContain("servicesToMatch");
    expect(keys("buyers-seeking-providers")).not.toContain("servicesToMatch");
    expect(keys("buyers-seeking-providers")).toContain("minBudgetUsd");
  });

  it.each(searchTypes.map((type): [string, SearchTypeDefinition] => [type.id, type]))(
    "keeps %s field definitions in step with its schema",
    (_id, type) => {
      const schemaKeys = Object.keys(type.criteriaSchema.shape).sort();
      expect(type.fields.map((field) => field.key).sort()).toEqual(schemaKeys);
      for (const field of type.fields) {
        const optional = type.criteriaSchema.shape[field.key]?.safeParse(undefined).success;
        expect({ key: field.key, required: field.required }).toEqual({ key: field.key, required: !optional });
        if (field.kind === "multiselect") {
          expect(field.options.length).toBeGreaterThan(0);
        }
      }
    },
  );

  it("strips the schema from the public view", () => {
    for (const type of searchTypes) {
      expect(Object.keys(toPublicSearchType(type)).sort()).toEqual(["description", "fields", "id", "label"]);
    }
  });
});

describe("parseSearchConfigInput", () => {
  it("accepts a valid config of each type", () => {
    expect(parseSearchConfigInput(buyersInput).criteria).toEqual(buyersInput.criteria);
    expect(parseSearchConfigInput(jobsInput).type).toBe("jobs-for-our-organizations");
  });

  it("trims names and drops blank keywords", () => {
    const parsed = parseSearchConfigInput({
      ...buyersInput,
      name: "  Clinics  ",
      criteria: { ...buyersInput.criteria, keywords: [" patient portal ", " "] },
    });
    expect(parsed.name).toBe("Clinics");
    expect(parsed.criteria.keywords).toEqual(["patient portal"]);
  });

  it("rejects an unknown type", () => {
    expect(issuePaths(() => parseSearchConfigInput({ ...buyersInput, type: "competitors" }))).toEqual([
      "type",
    ]);
  });

  it("requires the services field only for the jobs type", () => {
    const { servicesToMatch: _dropped, ...criteria } = jobsInput.criteria;
    expect(issuePaths(() => parseSearchConfigInput({ ...jobsInput, criteria }))).toEqual([
      "criteria.servicesToMatch",
    ]);
  });

  it("explains a missing required list in the field's own words", () => {
    const { servicesToMatch: _dropped, ...criteria } = jobsInput.criteria;
    const result = searchConfigInputSchema.safeParse({ ...jobsInput, criteria });
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      "Add at least one service our organizations deliver",
    ]);
  });

  it("rejects options that are not on the list", () => {
    const criteria = { ...buyersInput.criteria, industries: ["crypto casinos"] };
    expect(issuePaths(() => parseSearchConfigInput({ ...buyersInput, criteria }))).toEqual([
      "criteria.industries.0",
    ]);
  });

  it("requires at least one keyword", () => {
    const criteria = { ...buyersInput.criteria, keywords: [] };
    expect(issuePaths(() => parseSearchConfigInput({ ...buyersInput, criteria }))).toEqual([
      "criteria.keywords",
    ]);
  });
});

describe("filter help text", () => {
  it.each(searchTypes.map((type) => [type.id, type] as const))(
    "%s says industries and locations drop leads",
    (_id, type) => {
      const help = (key: string) => type.fields.find((field) => field.key === key)?.help;

      expect(help("industries")).toBe(
        "Only leads from these industries are kept. A lead with no stated industry is dropped. Leave empty to accept any industry.",
      );
      expect(help("locations")).toBe(
        "Only leads in these places are kept. Leave empty to search everywhere. Include Remote to keep remote posts. A lead with no stated location is dropped. Add cities too for countries we do not list.",
      );
    },
  );
});
