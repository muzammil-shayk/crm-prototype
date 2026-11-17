import styles from "../dynamic-form.module.css";
import type { FieldInputProps, FieldOfKind } from "./field-input-props";

export function MultiselectField({
  id,
  field,
  value,
  onChange,
  invalid,
}: FieldInputProps<FieldOfKind<"multiselect">, string[]>) {
  const toggle = (option: string, checked: boolean) => {
    const chosen = new Set(value);
    if (checked) chosen.add(option);
    else chosen.delete(option);
    onChange(field.options.map((item) => item.value).filter((item) => chosen.has(item)));
  };

  return (
    <div className={styles.options} data-invalid={invalid || undefined}>
      {field.options.map((option) => {
        const optionId = `${id}-${option.value}`;
        return (
          <label key={option.value} htmlFor={optionId} className={styles.option}>
            <input
              id={optionId}
              type="checkbox"
              name={field.key}
              value={option.value}
              checked={value.includes(option.value)}
              onChange={(event) => {
                toggle(option.value, event.target.checked);
              }}
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}
