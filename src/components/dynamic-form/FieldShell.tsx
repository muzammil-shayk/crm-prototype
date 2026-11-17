import type { ReactNode } from "react";
import styles from "./dynamic-form.module.css";

interface FieldShellProps {
  id: string;
  label: string;
  help?: string;
  required: boolean;
  error?: string;
  asGroup?: boolean;
  children: (describedBy: string, invalid: boolean) => ReactNode;
}

export function FieldShell({ id, label, help, required, error, asGroup = false, children }: FieldShellProps) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = [help ? helpId : "", error ? errorId : ""].filter(Boolean).join(" ");
  const heading = (
    <>
      <span className={styles.labelText}>{label}</span>
      {required ? <span className={styles.required}>Required</span> : null}
    </>
  );
  const body = (
    <>
      {help ? (
        <p id={helpId} className={styles.help}>
          {help}
        </p>
      ) : null}
      {children(describedBy, Boolean(error))}
      {error ? (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      ) : null}
    </>
  );

  if (asGroup) {
    return (
      <fieldset id={id} className={styles.field} aria-describedby={describedBy || undefined} tabIndex={-1}>
        <legend className={styles.label}>{heading}</legend>
        {body}
      </fieldset>
    );
  }
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {heading}
      </label>
      {body}
    </div>
  );
}
