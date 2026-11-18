import type { FieldDefinition } from "@/api-client/types";

export type FieldValue = string | string[];
export type FormValues = Readonly<Record<string, FieldValue | undefined>>;
export type FieldErrors = Readonly<Record<string, string | undefined>>;

const usesList = (field: FieldDefinition) => field.kind === "tags" || field.kind === "multiselect";

export function readText(field: FieldDefinition, values: FormValues): string {
  const value = values[field.key];
  return !usesList(field) && typeof value === "string" ? value : "";
}

export function readList(field: FieldDefinition, values: FormValues): string[] {
  const value = values[field.key];
  return usesList(field) && Array.isArray(value) ? value : [];
}

export function valuesFromCriteria(criteria: object): FormValues {
  const values: Record<string, FieldValue> = {};
  for (const [key, value] of Object.entries(criteria) as [string, unknown][]) {
    if (Array.isArray(value)) values[key] = value.filter((item) => typeof item === "string");
    else if (typeof value === "string" || typeof value === "number") values[key] = String(value);
  }
  return values;
}

export function toCriteria(fields: readonly FieldDefinition[], values: FormValues): Record<string, unknown> {
  const criteria: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.kind === "tags") {
      criteria[field.key] = readList(field, values)
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
    } else if (field.kind === "multiselect") {
      criteria[field.key] = readList(field, values);
    } else if (field.kind === "number") {
      const text = readText(field, values).trim();
      if (text !== "") criteria[field.key] = Number(text);
    } else {
      criteria[field.key] = readText(field, values).trim();
    }
  }
  return criteria;
}

function fieldProblem(field: FieldDefinition, values: FormValues): string | undefined {
  if (field.kind === "number") {
    const text = readText(field, values).trim();
    if (text === "") return field.required ? "Enter a number" : undefined;
    const number = Number(text);
    if (!Number.isInteger(number)) return "Use a whole number, without decimals";
    if (number >= field.min) return undefined;
    return field.min === 0 ? "This cannot be negative" : `Use ${field.min} or more`;
  }
  if (!field.required) return undefined;
  const filled = usesList(field)
    ? readList(field, values).some((item) => item.trim() !== "")
    : readText(field, values).trim() !== "";
  if (filled) return undefined;
  return MISSING[field.kind];
}

const MISSING: Record<Exclude<FieldDefinition["kind"], "number">, string> = {
  tags: "Add at least one entry",
  multiselect: "Choose at least one option",
  textarea: "Write something here",
};

export function validateFields(fields: readonly FieldDefinition[], values: FormValues): FieldErrors {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const problem = fieldProblem(field, values);
    if (problem) errors[field.key] = problem;
  }
  return errors;
}
