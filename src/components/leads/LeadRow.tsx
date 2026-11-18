import type { Lead, Tier } from "@/api-client/types";
import { LEAD_STATUS_LABEL, TIER_LABEL } from "@/components/search/run-labels";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { TIER_THRESHOLDS } from "@/lib/tiers";
import styles from "./leads.module.css";

type Scored = Pick<Lead, "score" | "tier" | "evidence">;

export const lacksQuote = (lead: Scored) =>
  lead.tier === "weak" && lead.evidence.every((quote) => quote.trim() === "");

export function tierByScore(score: number): Tier {
  if (score >= TIER_THRESHOLDS.strong) return "strong";
  return score >= TIER_THRESHOLDS.medium ? "medium" : "weak";
}

export function noQuoteReason(lead: Scored): string {
  return tierByScore(lead.score) === "weak"
    ? "No quote from the post backs the match."
    : `Scored ${lead.score} but kept Weak: no quote from the post backs the match.`;
}

export function noQuoteVerdict(lead: Scored): string | null {
  const byScore = tierByScore(lead.score);
  if (!lacksQuote(lead) || byScore === "weak") return null;
  return `Scored ${lead.score}, enough for ${TIER_LABEL[byScore]}, but nothing in the post could be quoted in support, so it stays Weak.`;
}

export function LeadRow({ lead, onOpen }: { lead: Lead; onOpen: (leadId: string) => void }) {
  const noQuote = lacksQuote(lead);
  const struck = noQuote && tierByScore(lead.score) !== "weak";
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
        <span className={`${styles.score} mono`} data-tier={lead.tier} data-no-quote={struck || undefined}>
          <span className="visually-hidden">Score </span>
          {lead.score}
        </span>
        <span className={styles.leadMain}>
          <span className={styles.leadTitle}>{lead.title}</span>
          <span className={styles.leadMeta}>
            <span>{lead.company}</span>
            <span>{lead.location}</span>
            <span>
              {lead.source}, <RelativeTime iso={lead.publishedAt} />
            </span>
          </span>
          {lead.matchedOrganization ? (
            <span className={styles.leadMatch}>Match: {lead.matchedOrganization.name}</span>
          ) : null}
          {noQuote ? (
            <span className={styles.noQuote} title={noQuoteReason(lead)}>
              <span className={styles.noQuoteMark} aria-hidden="true" />
              No quote
              <span className="visually-hidden">. {noQuoteReason(lead)}</span>
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
