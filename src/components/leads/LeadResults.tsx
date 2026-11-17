"use client";

import { useState } from "react";
import type { Lead, Tier } from "@/api-client/types";
import { TIER_LABEL, TIER_MEANING } from "@/components/search/run-labels";
import { EmptyState } from "@/components/ui/states";
import { groupLeads, type LeadFilter } from "./group-leads";
import { LeadFilters } from "./LeadFilters";
import { LeadRow } from "./LeadRow";
import styles from "./leads.module.css";

const ALL: LeadFilter = { tier: "all", status: "all" };

interface LeadResultsProps {
  leads: readonly Lead[];
  onOpenLead: (leadId: string) => void;
}

export function LeadResults({ leads, onOpenLead }: LeadResultsProps) {
  const [filter, setFilter] = useState<LeadFilter>(ALL);
  const { groups, tierCounts, total } = groupLeads(leads, filter);

  return (
    <section className={styles.results} aria-labelledby="results-heading">
      <div className={styles.resultsHead}>
        <h2 id="results-heading" className={styles.resultsTitle}>
          Leads
        </h2>
        <LeadFilters filter={filter} tierCounts={tierCounts} total={total} onChange={setFilter} />
      </div>
      {groups.length === 0 ? (
        <EmptyState
          title="No leads match these filters"
          action={
            <button
              type="button"
              className="button"
              onClick={() => {
                setFilter(ALL);
              }}
            >
              Show all leads
            </button>
          }
        />
      ) : (
        groups.map(({ tier, leads: tierLeads }) => (
          <TierGroup key={tier} tier={tier} leads={tierLeads} onOpenLead={onOpenLead} />
        ))
      )}
    </section>
  );
}

function TierGroup({
  tier,
  leads,
  onOpenLead,
}: {
  tier: Tier;
  leads: Lead[];
  onOpenLead: (id: string) => void;
}) {
  const headingId = `tier-${tier}`;
  return (
    <section className={styles.group} aria-labelledby={headingId}>
      <header className={styles.groupHead}>
        <h3 id={headingId} className={styles.groupTitle}>
          <span className="badge" data-tone={tier}>
            {TIER_LABEL[tier]}
          </span>
          <span className="numeric">{leads.length}</span>
        </h3>
        <p className={styles.groupMeaning}>{TIER_MEANING[tier]}</p>
      </header>
      <ul className={styles.leadList}>
        {leads.map((lead) => (
          <LeadRow key={lead.id} lead={lead} onOpen={onOpenLead} />
        ))}
      </ul>
    </section>
  );
}
