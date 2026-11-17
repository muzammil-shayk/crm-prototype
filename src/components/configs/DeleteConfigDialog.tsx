"use client";

import { useState } from "react";
import { api } from "@/api-client/api";
import { ApiError, describeApiError } from "@/api-client/api-error";
import type { SearchConfig } from "@/api-client/types";
import { Dialog } from "@/components/ui/Dialog";
import { Notice } from "@/components/ui/states";
import styles from "./configs.module.css";

interface DeleteConfigDialogProps {
  config: SearchConfig | null;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

export function DeleteConfigDialog({ config, onClose, onDeleted }: DeleteConfigDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    onClose();
  };

  const confirm = async (target: SearchConfig) => {
    setDeleting(true);
    setError(null);
    try {
      await api.configs.remove(target.id);
      onDeleted(target.id);
    } catch (problem) {
      if (problem instanceof ApiError && problem.code === "not_found") onDeleted(target.id);
      else setError(describeApiError(problem));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog
      open={config !== null}
      onClose={close}
      title="Delete this config?"
      footer={
        config ? (
          <>
            <button type="button" className="button" onClick={close}>
              Keep it
            </button>
            <button
              type="button"
              className="button button-danger"
              disabled={deleting}
              onClick={() => void confirm(config)}
            >
              {deleting ? "Deleting…" : "Delete config"}
            </button>
          </>
        ) : null
      }
    >
      {config ? (
        <div className={styles.stack}>
          <p>
            <strong>{config.name}</strong> will be removed. Leads its past runs found are kept.
          </p>
          {error ? (
            <Notice tone="error" live>
              <p>{error}</p>
            </Notice>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  );
}
