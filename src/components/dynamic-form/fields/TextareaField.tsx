import type { FieldDefinition } from "@/api-client/types";
import type { FieldInputProps } from "./field-input-props";

export function TextareaField({
  id,
  field,
  value,
  onChange,
  describedBy,
  invalid,
}: FieldInputProps<FieldDefinition, string>) {
  return (
    <textarea
      id={id}
      className="input textarea"
      rows={3}
      value={value}
      placeholder={field.placeholder}
      aria-describedby={describedBy || undefined}
      aria-invalid={invalid || undefined}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  );
}
