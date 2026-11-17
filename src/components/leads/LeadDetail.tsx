"use client";

import type { Lead, SearchType } from "@/api-client/types";
import { TIER_LABEL, TIER_MEANING } from "@/components/search/run-labels";
import { Dialog } from "@/components/ui/Dialog";
import { ExternalIcon } from "@/components/ui/icons";
import { Notice } from "@/components/ui/states";
import { highlight } from "./highlight";
import { LeadFacts } from "./LeadFacts";
import { LeadStatusControl } from "./LeadStatusControl";
import styles from "./leads.module.css";

interface LeadDetailProps {
  lead: Lead | null;
  configType: string;
  types: readonly SearchType[];
  onClose: () => void;
  onLeadChange: (lead: Lead) => void;
}

export function LeadDetail({ lead, configType, types, onClose, onLeadChange }: LeadDetailProps) {
  return (
    <Dialog
      open={lead !== null}
      onClose={onClose}
      variant="sheet"
      title={lead?.title ?? ""}
      footer={
        lead ? (
          <a className="button" href={lead.url} target="_blank" rel="noopener noreferrer">
            Open the original post on {lead.source}
            <ExternalIcon />
            <span className="visually-hidden">(opens in a new tab)</span>
          </a>
        ) : null
      }
    >
      {lead ? (
        <LeadDetailBody
          key={lead.id}
          lead={lead}
          configType={configType}
          types={types}
          onLeadChange={onLeadChange}
        />
      ) : null}
    </Dialog>
  );
}

function LeadDetailBody({
  lead,
  configType,
  types,
  onLeadChange,
}: Omit<LeadDetailProps, "onClose"> & { lead: Lead }) {
  return (
    <div className={styles.detail}>
      <div className={styles.verdict}>
        <span className={`${styles.verdictScore} mono`} data-tier={lead.tier}>
          {lead.score}
          <span className={styles.verdictOutOf}>/100</span>
        </span>
        <div>
          <span className="badge" data-tone={lead.tier}>
            {TIER_LABEL[lead.tier]}
          </span>
          <p className={styles.verdictMeaning}>{TIER_MEANING[lead.tier]}</p>
        </div>
      </div>

      <LeadStatusControl lead={lead} onLeadChange={onLeadChange} />

      <section className={styles.detailSection} aria-labelledby="why-heading">
        <h3 id="why-heading" className={styles.detailHeading}>
          Why it scored this way
        </h3>
        <p>{lead.explanation}</p>
        {lead.evaluationError ? (
          <Notice tone="warning" title="The evaluator's answer could not be used">
            <p>{lead.evaluationError}</p>
          </Notice>
        ) : null}
      </section>

      <section className={styles.detailSection} aria-labelledby="evidence-heading">
        <h3 id="evidence-heading" className={styles.detailHeading}>
          Evidence from the post
        </h3>
        {lead.evidence.length > 0 ? (
          <ul className={styles.evidence}>
            {lead.evidence.map((quote) => (
              <li key={quote}>
                <blockquote className={styles.quote}>{quote}</blockquote>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>
            Nothing in the post could be quoted in support, so this lead is Weak whatever its score.
          </p>
        )}
      </section>

      <LeadFacts lead={lead} types={types} configType={configType} />

      <details className={styles.post}>
        <summary>Full post</summary>
        <p className={styles.postBody}>
          {highlight(lead.body, lead.evidence).map((segment, index) =>
            segment.marked ? <mark key={index}>{segment.text}</mark> : segment.text,
          )}
        </p>
      </details>
    </div>
  );
}
