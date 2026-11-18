import type { RunStatus, Tier } from "@/api-client/types";
import { plural } from "@/components/format";
import { TIERS } from "@/lib/tiers";
import { TIER_LABEL } from "./run-labels";
import styles from "./tier-bar.module.css";

export type TierCounts = Readonly<Record<Tier, number>>;

export const totalLeads = (counts: TierCounts) => counts.strong + counts.medium + counts.weak;

export const tierBreakdown = (counts: TierCounts) =>
  TIERS.map((tier) => `${counts[tier]} ${TIER_LABEL[tier]}`).join(", ");

function Segments({ counts, size }: { counts: TierCounts; size: "full" | "mini" }) {
  const total = totalLeads(counts);
  return (
    <span className={styles.track} data-size={size} aria-hidden="true">
      {TIERS.map((tier, index) => (
        <span
          key={tier}
          className={styles.segment}
          data-tier={tier}
          data-after-other={TIERS.slice(0, index).some((earlier) => counts[earlier] > 0) || undefined}
          style={{ width: total > 0 ? `${(counts[tier] / total) * 100}%` : 0 }}
        />
      ))}
    </span>
  );
}

export function TierBar({ counts, pending = false }: { counts: TierCounts; pending?: boolean }) {
  return (
    <div className={styles.full}>
      <Segments counts={counts} size="full" />
      {pending ? (
        <p className={styles.note}>Leads are sorted into tiers when scoring finishes.</p>
      ) : (
        <ul className={styles.legend} aria-label={`${plural(totalLeads(counts), "lead")} by tier`}>
          {TIERS.map((tier) => (
            <li key={tier} className={styles.legendItem}>
              <span className={styles.swatch} data-tier={tier} aria-hidden="true" />
              {TIER_LABEL[tier]}
              <span className={`${styles.legendCount} numeric`}>{counts[tier]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TierBarMini({ counts }: { counts: TierCounts }) {
  const total = totalLeads(counts);
  if (total === 0) return <span className={styles.tallyText}>No leads matched</span>;
  return (
    <span className={styles.mini}>
      <Segments counts={counts} size="mini" />
      <span className={styles.miniText}>
        {plural(total, "lead")}
        {counts.strong > 0 ? `, ${counts.strong} strong` : ""}
        <span className="visually-hidden">: {tierBreakdown(counts)}</span>
      </span>
    </span>
  );
}

const NO_TALLY: Partial<Record<RunStatus, string>> = {
  running: "Scoring in progress",
  failed: "No leads saved",
  cancelled: "Cancelled, no leads kept",
};

export function RunTally({ status, tierCounts }: { status: RunStatus; tierCounts: TierCounts }) {
  const text = NO_TALLY[status];
  return text ? <span className={styles.tallyText}>{text}</span> : <TierBarMini counts={tierCounts} />;
}
