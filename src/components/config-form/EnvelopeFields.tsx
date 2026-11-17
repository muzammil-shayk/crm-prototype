import { fieldId } from "@/components/dynamic-form/DynamicForm";
import { FieldShell } from "@/components/dynamic-form/FieldShell";
import type { FieldErrors } from "@/components/dynamic-form/form-values";
import { DESCRIPTION_MAX, NAME_MAX } from "./config-draft";

interface EnvelopeFieldsProps {
  name: string;
  description: string;
  errors: FieldErrors;
  onChange: (key: "name" | "description", value: string) => void;
}

export function EnvelopeFields({ name, description, errors, onChange }: EnvelopeFieldsProps) {
  return (
    <>
      <FieldShell id={fieldId("name")} label="Name" required error={errors.name}>
        {(describedBy, invalid) => (
          <input
            id={fieldId("name")}
            className="input"
            value={name}
            maxLength={NAME_MAX}
            autoComplete="off"
            aria-describedby={describedBy || undefined}
            aria-invalid={invalid || undefined}
            onChange={(event) => {
              onChange("name", event.target.value);
            }}
          />
        )}
      </FieldShell>
      <FieldShell
        id={fieldId("description")}
        label="Description"
        help="Who you are looking for and why. The evaluator reads this when scoring."
        required={false}
        error={errors.description}
      >
        {(describedBy, invalid) => (
          <textarea
            id={fieldId("description")}
            className="input textarea"
            rows={4}
            value={description}
            maxLength={DESCRIPTION_MAX}
            aria-describedby={describedBy || undefined}
            aria-invalid={invalid || undefined}
            onChange={(event) => {
              onChange("description", event.target.value);
            }}
          />
        )}
      </FieldShell>
    </>
  );
}
