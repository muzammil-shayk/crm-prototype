import type { CSSProperties } from "react";
import type { Lead } from "@/api-client/types";
import styles from "./leads.module.css";

type Signal = NonNullable<Lead["signals"]>[number];

const signedPoints = (points: number) => (points > 0 ? `+${points}` : points < 0 ? `−${-points}` : "0");

export function ScoreBreakdown({ signals, score }: { signals: readonly Signal[]; score: number }) {
  const widest = Math.max(...signals.map((signal) => Math.abs(signal.points)), 1);
  const sum = signals.reduce((total, signal) => total + signal.points, 0);

  return (
    <>
      <ol className={styles.signals}>
        {signals.map((signal, index) => (
          <li
            key={index}
            className={styles.signal}
            data-sign={signal.points < 0 ? "negative" : signal.points > 0 ? "positive" : "zero"}
            style={{ "--share": Math.abs(signal.points) / widest, "--step": index } as CSSProperties}
          >
            <span className={`${styles.signalPoints} mono`}>
              <span aria-hidden="true">{signedPoints(signal.points)}</span>
              <span className="visually-hidden">
                {signal.points < 0 ? `minus ${-signal.points}` : `plus ${signal.points}`} points:
              </span>
            </span>
            <span className={styles.signalTrack} aria-hidden="true">
              <span className={styles.signalBar} />
            </span>
            <span className={styles.signalReason}>{signal.reason}</span>
          </li>
        ))}
      </ol>
      <p className={styles.signalTotal}>
        <span className={`${styles.signalPoints} mono`}>= {score}</span>
        <span className={styles.signalReason}>
          {sum === score
            ? "Score"
            : `Score, held to the 0 to 100 range (the signals add up to ${signedPoints(sum)})`}
        </span>
      </p>
    </>
  );
}
