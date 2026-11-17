export interface FieldOption {
  value: string;
  label: string;
}

interface FieldBase {
  key: string;
  label: string;
  help: string;
  required: boolean;
  placeholder?: string;
}

export type FieldDefinition =
  | (FieldBase & { kind: "tags" | "textarea" })
  | (FieldBase & { kind: "number"; min: number })
  | (FieldBase & { kind: "multiselect"; options: readonly FieldOption[] });

export function optionValues(options: readonly FieldOption[]): [string, ...string[]] {
  const [first, ...rest] = options.map((option) => option.value);
  if (first === undefined) throw new Error("A multiselect field needs at least one option");
  return [first, ...rest];
}
