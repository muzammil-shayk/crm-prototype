import type { Lead } from "@/api-client/types";
import { formatRelative } from "@/components/format";
import { LEAD_STATUS_LABEL } from "@/components/search/run-labels";
import styles from "./leads.module.css";

export function LeadRow({ lead, onOpen }: { lead: Lead; onOpen: (leadId: string) => void }) {
  return (
    <li>
      <button
        type="button"
        className={styles.leadRow}
        data-status={lead.status}
        aria-haspopup="dialog"
        onClick={() => {
          onOpen(lead.id);
        }}
      >
        <span className={`${styles.score} mono`} data-tier={lead.tier}>
          <span className="visually-hidden">Score </span>
          {lead.score}
        </span>
        <span className={styles.leadMain}>
          <span className={styles.leadTitle}>{lead.title}</span>
          <span className={styles.leadMeta}>
            <span>{lead.company}</span>
            <span>{lead.location}</span>
            <span>
              {lead.source}, <time dateTime={lead.publishedAt}>{formatRelative(lead.publishedAt)}</time>
            </span>
          </span>
          {lead.matchedOrganization ? (
            <span className={styles.leadMatch}>Match: {lead.matchedOrganization.name}</span>
          ) : null}
        </span>
        {lead.status !== "new" ? (
          <span className="badge" data-tone={lead.status}>
            {LEAD_STATUS_LABEL[lead.status]}
          </span>
        ) : null}
      </button>
    </li>
  );
}
