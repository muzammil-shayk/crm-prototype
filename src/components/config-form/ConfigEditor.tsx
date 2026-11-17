"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type SubmitEvent } from "react";
import { api } from "@/api-client/api";
import { ApiError, describeApiError } from "@/api-client/api-error";
import type { SearchConfig, SearchType, SearchTypeId } from "@/api-client/types";
import { DynamicForm, fieldId } from "@/components/dynamic-form/DynamicForm";
import {
  toCriteria,
  validateFields,
  valuesFromCriteria,
  type FieldErrors,
  type FormValues,
} from "@/components/dynamic-form/form-values";
import { searchUrl, startOrResumeSearch } from "@/components/search/start-search";
import { Notice } from "@/components/ui/states";
import { firstInvalidKey, mapIssues, validateEnvelope } from "./config-draft";
import styles from "./config-form.module.css";
import { EnvelopeFields } from "./EnvelopeFields";
import { TypePicker } from "./TypePicker";

type Intent = "save" | "run";

interface ConfigEditorProps {
  types: readonly [SearchType, ...SearchType[]];
  config: SearchConfig | null;
}

const NEEDS_ATTENTION = "Some fields need attention before this config can be saved.";

export function ConfigEditor({ types, config }: ConfigEditorProps) {
  const router = useRouter();
  const [type, setType] = useState<SearchTypeId>(config?.type ?? types[0].id);
  const [envelope, setEnvelope] = useState({
    name: config?.name ?? "",
    description: config?.description ?? "",
  });
  const [values, setValues] = useState<FormValues>(() => (config ? valuesFromCriteria(config.criteria) : {}));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<Intent | null>(null);

  const fields = (types.find((item) => item.id === type) ?? types[0]).fields;
  const order = ["name", "description", "type", ...fields.map((field) => field.key)];

  const showErrors = (next: FieldErrors, message: string) => {
    setErrors(next);
    setFormError(message);
    const key = firstInvalidKey(next, order);
    if (key) document.getElementById(fieldId(key))?.focus();
  };

  const change = (key: string, apply: () => void) => {
    apply();
    if (errors[key]) setErrors({ ...errors, [key]: undefined });
  };

  const submit = async (intent: Intent) => {
    const problems = {
      ...validateEnvelope(envelope.name, envelope.description),
      ...validateFields(fields, values),
    };
    if (Object.keys(problems).length > 0) {
      showErrors(problems, NEEDS_ATTENTION);
      return;
    }
    setPending(intent);
    setFormError(null);
    const draft = {
      type,
      name: envelope.name.trim(),
      description: envelope.description.trim(),
      criteria: toCriteria(fields, values),
    };
    try {
      const saved = config ? await api.configs.update(config.id, draft) : await api.configs.create(draft);
      if (intent === "save") {
        router.push("/");
        return;
      }
      const run = await startOrResumeSearch(saved.id).catch(() => null);
      router.push(searchUrl(saved.id, run?.id));
    } catch (error) {
      setPending(null);
      if (error instanceof ApiError && error.code === "validation_failed") {
        const { fieldErrors, unplaced } = mapIssues(error.details, fields);
        showErrors(fieldErrors, unplaced.length > 0 ? unplaced.join(" ") : NEEDS_ATTENTION);
      } else {
        setFormError(describeApiError(error));
      }
    }
  };

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { submitter } = event.nativeEvent;
    void submit(submitter instanceof HTMLButtonElement && submitter.value === "run" ? "run" : "save");
  };

  return (
    <form className={styles.form} noValidate onSubmit={onSubmit} aria-busy={pending !== null}>
      {formError ? (
        <Notice tone="error" live>
          <p>{formError}</p>
        </Notice>
      ) : null}

      <section className={styles.section} aria-labelledby="basics-heading">
        <h2 id="basics-heading" className={styles.sectionTitle}>
          Basics
        </h2>
        <EnvelopeFields
          name={envelope.name}
          description={envelope.description}
          errors={errors}
          onChange={(key, value) => {
            change(key, () => {
              setEnvelope((current) => ({ ...current, [key]: value }));
            });
          }}
        />
        <TypePicker types={types} value={type} error={errors.type} onChange={setType} />
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
            change(key, () => {
              setValues((current) => ({ ...current, [key]: value }));
            });
          }}
        />
      </section>

      <div className={styles.actions}>
        <Link href="/" className="button button-quiet">
          Cancel
        </Link>
        <button type="submit" value="save" className="button button-large" disabled={pending !== null}>
          {pending === "save" ? "Saving…" : "Save"}
        </button>
        <button
          type="submit"
          value="run"
          className="button button-primary button-large"
          disabled={pending !== null}
        >
          {pending === "run" ? "Starting search…" : "Save and run search"}
        </button>
      </div>
    </form>
  );
}
