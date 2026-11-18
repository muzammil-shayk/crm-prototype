import type { LastRun, RunStage, SearchConfigSummary, SearchType } from "@/api-client/types";
import { formatDateTime, formatDuration, plural } from "@/components/format";
import { optionLabel } from "@/components/leads/LeadFacts";
import { RUN_LIMITS } from "@/lib/run-limits";
import { mentions } from "@/lib/text";
import { TIER_THRESHOLDS } from "@/lib/tiers";
import { STAGES, STATUS_LABEL } from "./run-labels";
import { RunTally, TierBar, totalLeads } from "./TierBar";
import styles from "./search.module.css";

interface ConfigBriefProps {
  config: SearchConfigSummary;
  lastRun: LastRun;
  types: readonly SearchType[];
  running: boolean;
  starting: boolean;
  onStart: () => void;
  onOpenRun: (runId: string) => void;
}

const listOf = (items: readonly string[]) =>
  items.length <= 2 ? items.join(" or ") : `${items.slice(0, -1).join(", ")} or ${items.at(-1) ?? ""}`;

export function targetRules(locations: readonly string[], industries: readonly string[]): string[] {
  const remote = locations.some((place) => mentions(place, "remote"));
  const places = locations.filter((place) => !mentions(place, "remote"));
  const rules: string[] = [];
  if (places.length > 0) {
    rules.push(`Keeps only posts located in ${listOf(places)}${remote ? ", or remote" : ""}.`);
  } else if (remote) {
    rules.push("Keeps only remote posts.");
  }
  if (industries.length > 0) {
    rules.push(`Keeps only posts whose industry is ${listOf(industries)}.`);
  }

  const open = [locations.length === 0 && "location", industries.length === 0 && "industry"].filter(Boolean);
  const set = [locations.length > 0 && "location", industries.length > 0 && "industry"].filter(Boolean);
  if (open.length > 0) rules.push(`Any ${open.join(" and ")} is accepted.`);
  if (set.length > 0) rules.push(`A post that names no ${set.join(" or ")} is dropped.`);
  return rules;
}

function stagePlan(config: SearchConfigSummary, industryLabels: readonly string[]): Record<RunStage, string> {
  const { excludedKeywords, locations } = config.criteria;
  const { strong, medium } = TIER_THRESHOLDS;
  return {
    generating_queries: `Turns the config's search terms into up to ${RUN_LIMITS.maxQueries} queries.`,
    retrieving: "Fetches the posts each query returns.",
    filtering: [
      excludedKeywords.length > 0
        ? `Drops repeats and any post that mentions ${listOf(excludedKeywords.map((word) => `“${word}”`))}.`
        : "Drops posts that were already fetched by another query.",
      ...targetRules(locations, industryLabels),
    ].join(" "),
    evaluating: `Scores up to ${RUN_LIMITS.maxLeads} posts against the description and rules, quoting each post as evidence.`,
    classifying: `Strong scores ${strong} or more, Medium ${medium} to ${strong - 1}, Weak lower or with nothing to quote.`,
  };
}

export function ConfigBrief({
  config,
  lastRun,
  types,
  running,
  starting,
  onStart,
  onOpenRun,
}: ConfigBriefProps) {
  const typeLabel = types.find((type) => type.id === config.type)?.label;
  const { keywords, locations, industries } = config.criteria;
  const plan = stagePlan(
    config,
    industries.map((value) => optionLabel(types, value)),
  );
  const hasLeads = lastRun && totalLeads(lastRun.tierCounts) > 0;

  return (
    <article className={styles.brief} aria-labelledby="brief-title">
      <header className={styles.runHeading}>
        <h2 id="brief-title" className={styles.runTitle}>
          {config.name}
        </h2>
        <p className={styles.runMeta}>
          {typeLabel ? <span>{typeLabel}</span> : null}
          <span>{plural(keywords.length, "keyword")}</span>
          <span>{locations.length > 0 ? locations.join(", ") : "Any location"}</span>
        </p>
      </header>

      <section className={styles.briefSection} aria-labelledby="brief-last-run">
        <h3 id="brief-last-run" className={styles.briefHeading}>
          Last run
        </h3>
        {lastRun ? (
          <>
            <p className={styles.runMeta}>
              <span className="badge" data-tone={lastRun.status}>
                {STATUS_LABEL[lastRun.status]}
              </span>
              <span>
                <time dateTime={lastRun.startedAt}>{formatDateTime(lastRun.startedAt)}</time>
              </span>
              {lastRun.finishedAt ? (
                <span>Took {formatDuration(lastRun.startedAt, lastRun.finishedAt)}</span>
              ) : null}
            </p>
            {hasLeads ? (
              <TierBar counts={lastRun.tierCounts} />
            ) : (
              <RunTally status={lastRun.status} tierCounts={lastRun.tierCounts} />
            )}
            <button
              type="button"
              className={`button ${styles.briefOpen}`}
              onClick={() => {
                onOpenRun(lastRun.id);
              }}
            >
              Open this run
            </button>
          </>
        ) : (
          <p className={styles.briefNote}>
            Not run yet. The first search fetches fresh posts and scores them.
          </p>
        )}
      </section>

      <section className={styles.briefSection} aria-labelledby="brief-plan">
        <h3 id="brief-plan" className={styles.briefHeading}>
          What a search does
        </h3>
        <ol className={styles.plan}>
          {STAGES.map((stage) => (
            <li key={stage.id} className={styles.planStep}>
              <span className={styles.planLabel}>{stage.label}</span>
              <span className={styles.planText}>{plan[stage.id]}</span>
            </li>
          ))}
        </ol>
        <p className={styles.briefNote}>
          A run stops after {RUN_LIMITS.maxCostUnits} provider calls, so one config cannot run up costs.
        </p>
      </section>

      <div className={styles.briefActions}>
        <button
          type="button"
          className="button button-primary button-large"
          aria-disabled={starting || running || undefined}
          onClick={() => {
            if (!starting && !running) onStart();
          }}
        >
          {starting ? "Starting…" : "Run search"}
        </button>
      </div>
    </article>
  );
}
