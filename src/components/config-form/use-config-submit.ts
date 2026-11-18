"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type SubmitEvent } from "react";
import { api } from "@/api-client/api";
import { ApiError, describeApiError } from "@/api-client/api-error";
import type { FieldDefinition, SearchConfig, SearchTypeId } from "@/api-client/types";
import { fieldId } from "@/components/dynamic-form/DynamicForm";
import {
  toCriteria,
  validateFields,
  type FieldErrors,
  type FormValues,
} from "@/components/dynamic-form/form-values";
import { searchUrl } from "@/components/search/select-search";
import { startOrResumeSearch } from "@/components/search/start-search";
import { ENVELOPE_KEYS, firstInvalidKey, keepErrors, mapIssues, validateEnvelope } from "./config-draft";

type Intent = "save" | "run";

interface Draft {
  type: SearchTypeId;
  name: string;
  description: string;
  fields: readonly FieldDefinition[];
  values: FormValues;
}

const NEEDS_ATTENTION = "Some fields need attention before this config can be saved.";

export function useConfigSubmit(config: SearchConfig | null, draft: Draft) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<Intent | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ key: string; several: boolean } | null>(null);

  useEffect(() => {
    if (!focusRequest) return;
    const summaryLink = document.querySelector<HTMLElement>("[data-error-summary] a");
    const field = document.getElementById(fieldId(focusRequest.key));
    (focusRequest.several ? (summaryLink ?? field) : field)?.focus();
  }, [focusRequest]);

  const showErrors = (next: FieldErrors, message: string) => {
    setErrors(next);
    setFormError(message);
    const order = [...ENVELOPE_KEYS, ...draft.fields.map((field) => field.key)];
    const key = firstInvalidKey(next, order);
    if (key) setFocusRequest({ key, several: order.filter((item) => next[item]).length > 1 });
  };

  const clearError = (key: string) => {
    if (!errors[key]) return;
    const next = { ...errors, [key]: undefined };
    setErrors(next);
    if (formError === NEEDS_ATTENTION && Object.values(next).every((error) => !error)) setFormError(null);
  };

  const keepErrorsFor = (fields: readonly FieldDefinition[]) => {
    const next = keepErrors(errors, [...ENVELOPE_KEYS, ...fields.map((field) => field.key)]);
    setErrors(next);
    if (formError === NEEDS_ATTENTION && Object.keys(next).length === 0) setFormError(null);
  };

  const submit = async (intent: Intent) => {
    if (pending) return;
    const { type, fields, values } = draft;
    const problems = {
      ...validateEnvelope(draft.name, draft.description),
      ...validateFields(fields, values),
    };
    if (Object.keys(problems).length > 0) {
      showErrors(problems, NEEDS_ATTENTION);
      return;
    }
    setPending(intent);
    setFormError(null);
    const body = {
      type,
      name: draft.name.trim(),
      description: draft.description.trim(),
      criteria: toCriteria(fields, values),
    };
    try {
      const saved = config ? await api.configs.update(config.id, body) : await api.configs.create(body);
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

  return { errors, formError, pending, clearError, keepErrorsFor, onSubmit };
}
