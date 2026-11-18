"use client";

import { useState } from "react";
import type { SearchConfig, SearchType, SearchTypeId } from "@/api-client/types";
import { DynamicForm } from "@/components/dynamic-form/DynamicForm";
import { valuesFromCriteria, type FormValues } from "@/components/dynamic-form/form-values";
import { ENVELOPE_LABELS } from "./config-draft";
import styles from "./config-form.module.css";
import { EnvelopeFields } from "./EnvelopeFields";
import { CancelEdit, ErrorSummary } from "./FormProblems";
import { TypePicker } from "./TypePicker";
import { useConfigSubmit } from "./use-config-submit";

interface ConfigEditorProps {
  types: readonly [SearchType, ...SearchType[]];
  config: SearchConfig | null;
}

export function ConfigEditor({ types, config }: ConfigEditorProps) {
  const [type, setType] = useState<SearchTypeId>(config?.type ?? types[0].id);
  const [envelope, setEnvelope] = useState({
    name: config?.name ?? "",
    description: config?.description ?? "",
  });
  const [values, setValues] = useState<FormValues>(() => (config ? valuesFromCriteria(config.criteria) : {}));

  const fieldsOf = (id: SearchTypeId) => (types.find((item) => item.id === id) ?? types[0]).fields;
  const fields = fieldsOf(type);
  const { errors, formError, pending, clearError, keepErrorsFor, onSubmit } = useConfigSubmit(config, {
    type,
    ...envelope,
    fields,
    values,
  });
  const draft = JSON.stringify({ type, envelope, values });
  const [savedDraft] = useState(draft);
  const labels: Record<string, string> = {
    ...ENVELOPE_LABELS,
    ...Object.fromEntries(fields.map((field) => [field.key, field.label])),
  };
  const problems = Object.keys(labels).flatMap((key) => {
    const message = errors[key];
    return message ? [{ key, label: labels[key] ?? key, message }] : [];
  });

  return (
    <form className={styles.form} noValidate onSubmit={onSubmit} aria-busy={pending !== null}>
      {formError ? <ErrorSummary message={formError} problems={problems} /> : null}

      <section className={styles.section} aria-labelledby="basics-heading">
        <h2 id="basics-heading" className={styles.sectionTitle}>
          Basics
        </h2>
        <EnvelopeFields
          name={envelope.name}
          description={envelope.description}
          errors={errors}
          onChange={(key, value) => {
            clearError(key);
            setEnvelope((current) => ({ ...current, [key]: value }));
          }}
        />
        <TypePicker
          types={types}
          value={type}
          error={errors.type}
          onChange={(next) => {
            keepErrorsFor(fieldsOf(next));
            setType(next);
          }}
        />
      </section>

      <section className={styles.section} aria-labelledby="criteria-heading">
        <h2 id="criteria-heading" className={styles.sectionTitle}>
          What to look for
        </h2>
        <DynamicForm
          fields={fields}
          values={values}
          errors={errors}
          onChange={(key, value) => {
            clearError(key);
            setValues((current) => ({ ...current, [key]: value }));
          }}
        />
      </section>

      <div className={styles.actions}>
        <CancelEdit dirty={draft !== savedDraft} />
        <button
          type="submit"
          value="save"
          className="button button-large"
          aria-disabled={pending !== null || undefined}
        >
          {pending === "save" ? "Saving…" : "Save"}
        </button>
        <button
          type="submit"
          value="run"
          className="button button-primary button-large"
          aria-disabled={pending !== null || undefined}
        >
          {pending === "run" ? "Starting search…" : "Save and run search"}
        </button>
      </div>
    </form>
  );
}
