import type { SearchType, SearchTypeId } from "@/api-client/types";
import styles from "./config-form.module.css";

interface TypePickerProps {
  types: readonly SearchType[];
  value: SearchTypeId;
  error?: string;
  onChange: (type: SearchTypeId) => void;
}

export function TypePicker({ types, value, error, onChange }: TypePickerProps) {
  return (
    <fieldset id="field-type" className={styles.typePicker} tabIndex={-1} aria-describedby="field-type-help">
      <legend className={styles.legend}>Search type</legend>
      <p id="field-type-help" className={styles.legendHelp}>
        Switching keeps the fields both types share.
      </p>
      <div className={styles.typeOptions}>
        {types.map((type) => (
          <label key={type.id} className={styles.typeOption}>
            <input
              type="radio"
              name="type"
              value={type.id}
              checked={value === type.id}
              onChange={() => {
                onChange(type.id);
              }}
            />
            <span className={styles.typeText}>
              <span className={styles.typeLabel}>{type.label}</span>
              <span className={styles.typeDescription}>{type.description}</span>
            </span>
          </label>
        ))}
      </div>
      {error ? <p className={styles.fieldError}>{error}</p> : null}
    </fieldset>
  );
}
