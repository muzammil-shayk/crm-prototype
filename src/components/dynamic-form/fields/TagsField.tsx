"use client";

import { useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { SmallCloseIcon } from "@/components/ui/icons";
import styles from "../dynamic-form.module.css";
import type { FieldDefinition } from "@/api-client/types";
import type { FieldInputProps } from "./field-input-props";

export function addTags(current: readonly string[], text: string): string[] {
  const next = [...current];
  for (const part of text.split(",")) {
    const tag = part.trim();
    if (tag && !next.some((existing) => existing.toLowerCase() === tag.toLowerCase())) next.push(tag);
  }
  return next;
}

export function TagsField({
  id,
  field,
  value,
  onChange,
  describedBy,
  invalid,
}: FieldInputProps<FieldDefinition, string[]>) {
  const [draft, setDraft] = useState("");
  const hintId = `${id}-hint`;

  const commit = (text: string) => {
    setDraft("");
    const next = addTags(value, text);
    if (next.length !== value.length) onChange(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft);
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text");
    if (!pasted.includes(",")) return;
    event.preventDefault();
    commit(draft + pasted);
  };

  return (
    <div className={styles.tagBox} data-invalid={invalid || undefined}>
      {value.length > 0 ? (
        <ul className={styles.tagList} aria-label={`${field.label}: ${value.length} added`}>
          {value.map((tag) => (
            <li key={tag} className={styles.tag}>
              <span>{tag}</span>
              <button
                type="button"
                className={styles.tagRemove}
                aria-label={`Remove ${tag}`}
                onClick={() => {
                  onChange(value.filter((item) => item !== tag));
                }}
              >
                <SmallCloseIcon />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <input
        id={id}
        className={styles.tagInput}
        value={draft}
        placeholder={field.placeholder}
        aria-describedby={[describedBy, hintId].filter(Boolean).join(" ")}
        aria-invalid={invalid || undefined}
        autoComplete="off"
        enterKeyHint="done"
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onBlur={() => {
          commit(draft);
        }}
      />
      <span id={hintId} className="visually-hidden">
        Press Enter or type a comma to add an entry. Backspace removes the last one.
      </span>
    </div>
  );
}
