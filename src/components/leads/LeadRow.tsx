import type { Lead } from "@/api-client/types";
import { formatUsd } from "@/components/format";
import { LEAD_STATUS_LABEL } from "@/components/search/run-labels";
import { RelativeTime } from "@/components/ui/RelativeTime";
import styles from "./leads.module.css";
import { noQuoteReason, noQuoteVerdict } from "./no-quote";

export function LeadRow({ lead, onOpen }: { lead: Lead; onOpen: (leadId: string) => void }) {
  const noQuote = noQuoteReason(lead);
  const struck = noQuoteVerdict(lead) !== null;
  return (
    <li>
      <button
        type="button"
        className={styles.leadRow}
        data-tier={lead.tier}
        data-status={lead.status}
        aria-haspopup="dialog"
        onClick={() => {
          onOpen(lead.id);
        }}
      >
        <span className={`${styles.score} mono`} data-tier={lead.tier} data-no-quote={struck || undefined}>
          <span className="visually-hidden">Score </span>
          {lead.score}
        </span>
        <span className={styles.leadMain}>
          <span className={styles.leadTitle}>{lead.title}</span>
          <span className={styles.leadMeta}>
            <span>{lead.company}</span>
            <span>{lead.location}</span>
            {lead.budgetUsd !== null ? (
              <span className={styles.leadBudget}>
                <span className="mono">{formatUsd(lead.budgetUsd)}</span> budget
              </span>
            ) : null}
            <span>
              Posted <RelativeTime iso={lead.publishedAt} /> on {lead.source}
            </span>
          </span>
          {lead.matchedOrganization ? (
            <span className={styles.leadMatch}>Match: {lead.matchedOrganization.name}</span>
          ) : null}
          {noQuote ? (
            <span className={styles.noQuote} title={noQuote}>
              <span className={styles.noQuoteMark} aria-hidden="true" />
              No quote
              <span className="visually-hidden">. {noQuote}</span>
            </span>
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
