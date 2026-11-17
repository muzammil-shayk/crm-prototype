import type { FieldDefinition } from "@/api-client/types";
import styles from "./dynamic-form.module.css";
import { FieldShell } from "./FieldShell";
import { readList, readText, type FieldErrors, type FieldValue, type FormValues } from "./form-values";
import { MultiselectField } from "./fields/MultiselectField";
import { NumberField } from "./fields/NumberField";
import { TagsField } from "./fields/TagsField";
import { TextareaField } from "./fields/TextareaField";

type ChangeHandler = (key: string, value: FieldValue) => void;

interface DynamicFormProps {
  fields: readonly FieldDefinition[];
  values: FormValues;
  errors: FieldErrors;
  onChange: ChangeHandler;
}

interface FieldControlProps {
  field: FieldDefinition;
  values: FormValues;
  onChange: ChangeHandler;
  describedBy: string;
  invalid: boolean;
}

export const fieldId = (key: string) => `field-${key}`;

function FieldControl({ field, values, onChange, describedBy, invalid }: FieldControlProps) {
  const shared = { id: fieldId(field.key), describedBy, invalid };
  const change = (value: FieldValue) => {
    onChange(field.key, value);
  };
  switch (field.kind) {
    case "tags":
      return <TagsField {...shared} field={field} value={readList(field, values)} onChange={change} />;
    case "multiselect":
      return <MultiselectField {...shared} field={field} value={readList(field, values)} onChange={change} />;
    case "number":
      return <NumberField {...shared} field={field} value={readText(field, values)} onChange={change} />;
    case "textarea":
      return <TextareaField {...shared} field={field} value={readText(field, values)} onChange={change} />;
  }
}

export function DynamicForm({ fields, values, errors, onChange }: DynamicFormProps) {
  return (
    <div className={styles.fields}>
      {fields.map((field) => (
        <FieldShell
          key={field.key}
          id={fieldId(field.key)}
          label={field.label}
          help={field.help}
          required={field.required}
          error={errors[field.key]}
          asGroup={field.kind === "multiselect"}
        >
          {(describedBy, invalid) => (
            <FieldControl
              field={field}
              values={values}
              onChange={onChange}
              describedBy={describedBy}
              invalid={invalid}
            />
          )}
        </FieldShell>
      ))}
    </div>
  );
}
