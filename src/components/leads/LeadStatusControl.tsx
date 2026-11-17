"use client";

import { useState } from "react";
import { api } from "@/api-client/api";
import { describeApiError } from "@/api-client/api-error";
import type { Lead, LeadStatus } from "@/api-client/types";
import { LEAD_STATUS_LABEL, LEAD_STATUSES } from "@/components/search/run-labels";
import { Notice } from "@/components/ui/states";
import styles from "./leads.module.css";

interface LeadStatusControlProps {
  lead: Lead;
  onLeadChange: (lead: Lead) => void;
}

export function LeadStatusControl({ lead, onLeadChange }: LeadStatusControlProps) {
  const [saving, setSaving] = useState<LeadStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async (status: LeadStatus) => {
    if (saving !== null || status === lead.status) return;
    const previous = lead;
    setSaving(status);
    setError(null);
    onLeadChange({ ...lead, status });
    try {
      onLeadChange(await api.leads.setStatus(lead.id, status));
    } catch (problem) {
      onLeadChange(previous);
      setError(`${describeApiError(problem, "lead")} The status was not changed.`);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className={styles.statusControl}>
      <fieldset className={styles.statusFieldset}>
        <legend className={styles.detailHeading}>Status</legend>
        <div className={styles.segmented}>
          {LEAD_STATUSES.map((status) => (
            <label key={status} className={styles.segment}>
              <input
                type="radio"
                name={`status-${lead.id}`}
                value={status}
                checked={lead.status === status}
                onChange={() => void choose(status)}
              />
              <span>{LEAD_STATUS_LABEL[status]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <span className="visually-hidden" aria-live="polite">
        {saving ? `Saving status ${LEAD_STATUS_LABEL[saving]}` : ""}
      </span>
      {error ? (
        <Notice tone="error" live>
          <p>{error}</p>
        </Notice>
      ) : null}
    </div>
  );
}
