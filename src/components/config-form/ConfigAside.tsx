import { TIER_LABEL, TIER_MEANING } from "@/components/search/run-labels";
import { RUN_LIMITS } from "@/lib/run-limits";
import { TIERS } from "@/lib/tiers";
import styles from "./config-form.module.css";

export function ConfigAside() {
  return (
    <aside className={styles.aside} aria-label="How a search uses this config">
      <section className={styles.asideSection} aria-labelledby="aside-limits">
        <h2 id="aside-limits" className={styles.asideTitle}>
          Every run
        </h2>
        <ul className={styles.limits}>
          <li>
            <span className="numeric">{RUN_LIMITS.maxQueries}</span> queries at most, written from the search
            terms
          </li>
          <li>
            <span className="numeric">{RUN_LIMITS.maxLeads}</span> posts scored at most, after duplicates,
            exclusions and posts outside the location or industry filters are removed
          </li>
          <li>
            <span className="numeric">{RUN_LIMITS.maxCostUnits}</span> provider calls before the run stops
          </li>
        </ul>
      </section>
      <section className={styles.asideSection} aria-labelledby="aside-tiers">
        <h2 id="aside-tiers" className={styles.asideTitle}>
          How leads are sorted
        </h2>
        <dl className={styles.tiers}>
          {TIERS.map((tier) => (
            <div key={tier} className={styles.tier}>
              <dt>
                <span className="badge" data-tone={tier}>
                  {TIER_LABEL[tier]}
                </span>
              </dt>
              <dd>{TIER_MEANING[tier]}</dd>
            </div>
          ))}
        </dl>
      </section>
    </aside>
  );
}
