import type { FieldDefinition } from "@/api-client/types";

export type FieldOfKind<Kind extends FieldDefinition["kind"]> = Extract<FieldDefinition, { kind: Kind }>;

export interface FieldInputProps<Field extends FieldDefinition, Value> {
  id: string;
  field: Field;
  value: Value;
  onChange: (value: Value) => void;
  describedBy: string;
  invalid: boolean;
}
