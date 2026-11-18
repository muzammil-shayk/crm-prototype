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

export function TierBar({ counts }: { counts: TierCounts }) {
  return (
    <div className={styles.full}>
      <Segments counts={counts} size="full" />
      <ul className={styles.legend} aria-label={`${plural(totalLeads(counts), "lead")} by tier`}>
        {TIERS.map((tier) => (
          <li key={tier} className={styles.legendItem}>
            <span className={styles.swatch} data-tier={tier} aria-hidden="true" />
            {TIER_LABEL[tier]}
            <span className={`${styles.legendCount} mono`}>{counts[tier]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TierBarMini({ counts, label }: { counts: TierCounts; label: string }) {
  return (
    <span className={styles.mini}>
      <Segments counts={counts} size="mini" />
      <span className={styles.miniText}>
        {label}
        <span className="visually-hidden">: {tierBreakdown(counts)}</span>
      </span>
    </span>
  );
}

export function tallyLabel(status: RunStatus, counts: TierCounts): string {
  const total = totalLeads(counts);
  if (status === "running") return "Scoring in progress";
  if (status === "cancelled")
    return total > 0 ? `Cancelled, ${plural(total, "lead")} kept` : "Cancelled, no leads kept";
  if (total === 0) return status === "failed" ? "No leads saved" : "No leads matched";
  return `${plural(total, "lead")}${counts.strong > 0 ? `, ${counts.strong} strong` : ""}`;
}

export function RunTally({ status, tierCounts }: { status: RunStatus; tierCounts: TierCounts }) {
  const label = tallyLabel(status, tierCounts);
  return status === "running" || totalLeads(tierCounts) === 0 ? (
    <span className={styles.tallyText}>{label}</span>
  ) : (
    <TierBarMini counts={tierCounts} label={label} />
  );
}
