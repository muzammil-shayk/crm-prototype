import type { LeadStatus, Tier } from "@/api-client/types";
import { LEAD_STATUS_LABEL, LEAD_STATUSES, TIER_LABEL } from "@/components/search/run-labels";
import type { LeadFilter } from "./group-leads";
import styles from "./leads.module.css";

interface LeadFiltersProps {
  filter: LeadFilter;
  tierCounts: Record<Tier, number>;
  total: number;
  onChange: (filter: LeadFilter) => void;
}

const TIER_OPTIONS: { value: LeadFilter["tier"]; label: string }[] = [
  { value: "all", label: "All" },
  { value: "strong", label: TIER_LABEL.strong },
  { value: "medium", label: TIER_LABEL.medium },
  { value: "weak", label: TIER_LABEL.weak },
];

const isStatus = (value: string): value is LeadStatus => LEAD_STATUSES.some((status) => status === value);

export function LeadFilters({ filter, tierCounts, total, onChange }: LeadFiltersProps) {
  return (
    <div className={styles.filters}>
      <fieldset className={styles.segmented}>
        <legend className="visually-hidden">Tier</legend>
        {TIER_OPTIONS.map((option) => (
          <label key={option.value} className={styles.segment}>
            <input
              type="radio"
              name="lead-tier"
              value={option.value}
              checked={filter.tier === option.value}
              onChange={() => {
                onChange({ ...filter, tier: option.value });
              }}
            />
            <span>{option.label}</span>
            <span className={`${styles.segmentCount} numeric`}>
              {option.value === "all" ? total : tierCounts[option.value]}
            </span>
          </label>
        ))}
      </fieldset>
      <label htmlFor="lead-status-filter" className="visually-hidden">
        Lead status
      </label>
      <select
        id="lead-status-filter"
        className={`input ${styles.statusSelect}`}
        value={filter.status}
        onChange={(event) => {
          const { value } = event.target;
          onChange({ ...filter, status: isStatus(value) ? value : "all" });
        }}
      >
        <option value="all">Any status</option>
        {LEAD_STATUSES.map((status) => (
          <option key={status} value={status}>
            {LEAD_STATUS_LABEL[status]}
          </option>
        ))}
      </select>
    </div>
  );
}
