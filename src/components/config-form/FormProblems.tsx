"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fieldId } from "@/components/dynamic-form/DynamicForm";
import { Dialog } from "@/components/ui/Dialog";
import { Notice } from "@/components/ui/states";
import styles from "./config-form.module.css";

export interface FieldProblem {
  key: string;
  label: string;
  message: string;
}

export function ErrorSummary({ message, problems }: { message: string; problems: readonly FieldProblem[] }) {
  return (
    <div className={styles.errorSummary} data-error-summary>
      <Notice tone="error" title={message} live>
        {problems.length > 0 ? (
          <ul className={styles.problems}>
            {problems.map((problem) => (
              <li key={problem.key}>
                <a
                  href={`#${fieldId(problem.key)}`}
                  onClick={(event) => {
                    event.preventDefault();
                    document.getElementById(fieldId(problem.key))?.focus();
                  }}
                >
                  {problem.label}
                </a>
                : {problem.message}
              </li>
            ))}
          </ul>
        ) : null}
      </Notice>
    </div>
  );
}

export function CancelEdit({ dirty }: { dirty: boolean }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const stay = () => {
    setAsking(false);
  };

  return (
    <>
      <Link
        href="/"
        className="button button-quiet"
        onClick={(event) => {
          if (!dirty) return;
          event.preventDefault();
          setAsking(true);
        }}
      >
        Cancel
      </Link>
      <Dialog
        open={asking}
        onClose={stay}
        title="Discard your changes?"
        footer={
          <>
            <button type="button" className="button" onClick={stay}>
              Keep editing
            </button>
            <button
              type="button"
              className="button button-danger"
              onClick={() => {
                router.push("/");
              }}
            >
              Discard
            </button>
          </>
        }
      >
        <p>Your edits to this config have not been saved. Leaving now throws them away.</p>
      </Dialog>
    </>
  );
}
