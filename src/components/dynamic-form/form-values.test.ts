import { describe, expect, it } from "vitest";
import type { FieldDefinition } from "@/api-client/types";
import { toCriteria, validateFields, valuesFromCriteria } from "./form-values";
import { addTags } from "./fields/TagsField";

const keywords: FieldDefinition = {
  key: "keywords",
  kind: "tags",
  label: "Keywords and phrases",
  help: "",
  required: true,
};
const rules: FieldDefinition = { key: "rules", kind: "textarea", label: "Rules", help: "", required: false };
const budget: FieldDefinition = {
  key: "minBudgetUsd",
  kind: "number",
  label: "Minimum budget",
  help: "",
  required: false,
  min: 0,
};
const industries: FieldDefinition = {
  key: "industries",
  kind: "multiselect",
  label: "Industries",
  help: "",
  required: false,
  options: [
    { value: "healthcare", label: "Healthcare" },
    { value: "fintech", label: "Financial services" },
  ],
};
const fields = [keywords, rules, budget, industries];

describe("toCriteria", () => {
  it("trims tags and text, converts numbers and omits an empty number", () => {
    const values = { keywords: [" patient portal ", " "], rules: "  Budget stated. ", minBudgetUsd: "" };
    expect(toCriteria(fields, values)).toEqual({
      keywords: ["patient portal"],
      rules: "Budget stated.",
      industries: [],
    });
    expect(toCriteria([budget], { minBudgetUsd: "20000" })).toEqual({ minBudgetUsd: 20000 });
  });

  it("only sends the fields of the current search type", () => {
    const values = { keywords: ["dbt"], servicesToMatch: ["AWS"] };
    expect(Object.keys(toCriteria([keywords], values))).toEqual(["keywords"]);
  });

  it("round-trips stored criteria through the form values", () => {
    const criteria = { keywords: ["dbt"], rules: "", minBudgetUsd: 15000, industries: ["fintech"] };
    expect(toCriteria(fields, valuesFromCriteria(criteria))).toEqual(criteria);
  });
});

describe("validateFields", () => {
  it("mirrors the server's required and number rules", () => {
    expect(validateFields(fields, { keywords: ["  "], minBudgetUsd: "-5" })).toEqual({
      keywords: "Add at least one entry to keywords and phrases",
      minBudgetUsd: "Enter 0 or more",
    });
    expect(validateFields([budget], { minBudgetUsd: "12.5" })).toEqual({
      minBudgetUsd: "Enter a whole number",
    });
    expect(validateFields(fields, { keywords: ["dbt"], minBudgetUsd: "0" })).toEqual({});
  });
});

describe("addTags", () => {
  it("splits on commas and skips blanks and case-insensitive duplicates", () => {
    expect(addTags(["AWS"], "aws, Kubernetes,, dbt ")).toEqual(["AWS", "Kubernetes", "dbt"]);
  });
});
