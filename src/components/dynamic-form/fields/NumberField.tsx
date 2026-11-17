import styles from "../dynamic-form.module.css";
import type { FieldInputProps, FieldOfKind } from "./field-input-props";

export function NumberField({
  id,
  field,
  value,
  onChange,
  describedBy,
  invalid,
}: FieldInputProps<FieldOfKind<"number">, string>) {
  return (
    <input
      id={id}
      className={`input ${styles.number}`}
      type="number"
      inputMode="numeric"
      min={field.min}
      step={1}
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
