import type { CSSProperties } from "react";
import type { SearchRun } from "@/api-client/types";
import { plural } from "@/components/format";
import { CountUp } from "@/components/ui/CountUp";
import { runFunnel, share, type Funnel } from "./funnel";
import { TIER_LABEL } from "./run-labels";
import styles from "./funnel.module.css";

export const TRACE_STEP_MS = 110;

function caption(run: SearchRun, funnel: Funnel): string {
  const fetched = funnel.steps[0]?.count;
  const leads = funnel.tiers?.reduce((sum, { count }) => sum + count, 0) ?? 0;
  if (run.status === "running") {
    return fetched === null || fetched === undefined
      ? "Waiting for the first posts"
      : `${plural(fetched, "post")} fetched so far`;
  }
  if (run.status === "cancelled") return `Stopped after ${plural(fetched ?? 0, "post")} fetched`;
  return `How ${plural(fetched ?? 0, "post")} became ${plural(leads, "lead")}`;
}

interface RunFunnelProps {
  run: SearchRun;
  replay?: boolean;
  size?: "full" | "mini";
}

export function RunFunnel({ run, replay = false, size = "full" }: RunFunnelProps) {
  const funnel = runFunnel(run.stats, run);
  const live = run.status === "running";
  const missing = live ? "Not counted yet" : "Not reached";

  return (
    <figure
      className={styles.funnel}
      data-size={size}
      data-replay={replay || undefined}
      aria-labelledby={size === "full" ? `funnel-${run.id}` : undefined}
      aria-label={size === "mini" ? caption(run, funnel) : undefined}
    >
      {size === "full" ? (
        <figcaption className={styles.head}>
          <span id={`funnel-${run.id}`} className={styles.caption}>
            {caption(run, funnel)}
          </span>
          <span className={`${styles.meta} mono`}>
            {funnel.queries === null ? (
              "Writing queries"
            ) : (
              <>
                {plural(funnel.queries, "query", "queries")}, {plural(funnel.calls ?? 0, "provider call")}
              </>
            )}
          </span>
        </figcaption>
      ) : null}
      <ol className={styles.steps}>
        {funnel.steps.map((step, index) => {
          const shed = step.shed.reduce((sum, { count }) => sum + count, 0);
          const tiers = step.key === "scored" ? funnel.tiers : null;
          return (
            <li
              key={step.key}
              className={styles.step}
              data-state={step.count === null ? "pending" : "known"}
              data-stopped={funnel.stoppedAt === step.key || undefined}
              style={
                {
                  "--step": index,
                  "--kept": share(step.count, funnel.scale),
                  "--shed": step.count === null ? 0 : share(shed, funnel.scale),
                  "--queued": share(step.queued, funnel.scale),
                } as CSSProperties
              }
            >
              <span className={styles.band} aria-hidden="true">
                {tiers ? (
                  <span className={styles.tiers}>
                    {tiers.map(({ tier, count }) => (
                      <span
                        key={tier}
                        className={styles.tier}
                        data-tier={tier}
                        style={{ "--part": share(count, funnel.scale) } as CSSProperties}
                      />
                    ))}
                  </span>
                ) : (
                  <span className={styles.kept} />
                )}
                <span className={styles.queued} />
                <span className={styles.shed} />
              </span>
              <span className={styles.label}>{step.label}</span>
              <span className={`${styles.count} mono`}>
                {step.count === null ? (
                  <>
                    <span aria-hidden="true">–</span>
                    <span className="visually-hidden">{missing}</span>
                  </>
                ) : (
                  <CountUp
                    value={step.count}
                    play={replay}
                    follow={live}
                    delayMs={replay ? index * TRACE_STEP_MS : 0}
                  />
                )}
              </span>
              {size === "full" ? (
                <span className={styles.notes}>
                  {funnel.stoppedAt === step.key ? (
                    <span className={styles.stopped}>Cancelled here</span>
                  ) : null}
                  {step.count !== null
                    ? step.shed.map(({ count, label }) => (
                        <span key={label} className={styles.shedText}>
                          <span className="mono">−{count}</span> {label}
                        </span>
                      ))
                    : null}
                  {step.queued > 0 ? (
                    <span className={styles.shedText}>
                      <span className="mono">{step.queued}</span> waiting
                    </span>
                  ) : null}
                  {tiers ? (
                    <span className={styles.legend}>
                      {tiers.map(({ tier, count }) => (
                        <span key={tier} className={styles.legendItem}>
                          <span className={styles.swatch} data-tier={tier} aria-hidden="true" />
                          {TIER_LABEL[tier]} <span className="mono">{count}</span>
                        </span>
                      ))}
                    </span>
                  ) : step.key === "scored" && live && step.count !== null ? (
                    <span className={styles.shedText}>Tiers when scoring ends</span>
                  ) : null}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
