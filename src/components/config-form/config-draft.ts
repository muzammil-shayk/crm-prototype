import type { FieldIssue } from "@/api-client/api-error";
import type { FieldDefinition } from "@/api-client/types";
import type { FieldErrors } from "@/components/dynamic-form/form-values";

export const NAME_MAX = 120;
export const DESCRIPTION_MAX = 4000;

export function validateEnvelope(name: string, description: string): FieldErrors {
  const errors: Record<string, string> = {};
  const trimmedName = name.trim();
  if (trimmedName === "") errors.name = "Give the search a name";
  else if (trimmedName.length > NAME_MAX) errors.name = `Keep the name under ${NAME_MAX} characters`;
  if (description.trim().length > DESCRIPTION_MAX) {
    errors.description = "Keep the description under 4,000 characters";
  }
  return errors;
}

export interface IssueMapping {
  fieldErrors: FieldErrors;
  unplaced: string[];
}

export function mapIssues(issues: readonly FieldIssue[], fields: readonly FieldDefinition[]): IssueMapping {
  const known = new Set(["name", "description", "type", ...fields.map((field) => field.key)]);
  const fieldErrors: Record<string, string> = {};
  const unplaced: string[] = [];
  for (const { path, message } of issues) {
    const [head = "", next = ""] = path.split(".");
    const key = head === "criteria" ? next : head;
    if (!known.has(key)) unplaced.push(message);
    else fieldErrors[key] ??= message;
  }
  return { fieldErrors, unplaced };
}

export function firstInvalidKey(errors: FieldErrors, order: readonly string[]): string | undefined {
  return order.find((key) => errors[key] !== undefined);
}
