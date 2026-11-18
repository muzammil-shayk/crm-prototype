import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import type { SearchConfigSummary } from "@/api-client/types";
import { EmptyState, Notice } from "@/components/ui/states";
import { RunTally } from "./TierBar";
import styles from "./search.module.css";

interface SearchControlsProps {
  configs: readonly SearchConfigSummary[];
  configId: string | null;
  running: boolean;
  starting: boolean;
  error: string | null;
  onSelectConfig: (configId: string) => void;
  onStart: (configId: string) => void;
}

function settleList(list: HTMLElement) {
  if (!list.clientHeight) return;
  const current = list.scrollTop;
  list.style.setProperty("--tail", "0px");
  const rowTops = Array.from(list.children, (row) => (row as HTMLElement).offsetTop);
  const inset = rowTops[0] ?? 0;
  const starts = rowTops.map((rowTop) => rowTop - inset);
  const max = list.scrollHeight - list.clientHeight;
  const end = starts.find((start) => start >= max) ?? max;
  list.style.setProperty("--tail", `${end - max}px`);
  const option = list.querySelector("input:checked")?.closest("label");
  if (!option) return;
  const { offsetTop: top, offsetHeight: height } = option;
  const visible = top >= current && top + height <= current + list.clientHeight;
  const target = visible ? current : top - (list.clientHeight - height) / 2;
  const lowest = top + height + inset - list.clientHeight;
  list.scrollTop = starts
    .filter((start) => start >= lowest && start <= top - inset && start <= end)
    .reduce(
      (best, start) => (Math.abs(start - target) < Math.abs(best - target) ? start : best),
      top - inset,
    );
}

export function SearchControls({
  configs,
  configId,
  running,
  starting,
  error,
  onSelectConfig,
  onStart,
}: SearchControlsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    settleList(list);
    const observer = new ResizeObserver(() => {
      settleList(list);
    });
    observer.observe(list, { box: "border-box" });
    return () => {
      observer.disconnect();
    };
  }, [configId, configs.length]);

  if (!configId) {
    return (
      <EmptyState
        title="Nothing to run yet"
        action={
          <Link href="/configs/new" className="button button-primary">
            Create a config
          </Link>
        }
      >
        Live search runs a saved config: the keywords, places and rules for one kind of lead. Save your first
        one and it appears here, ready to run.
      </EmptyState>
    );
  }

  return (
    <div className={styles.controls}>
      <label htmlFor="search-config" className={`${styles.controlLabel} ${styles.compactPicker}`}>
        Config
      </label>
      <select
        id="search-config"
        className={`input ${styles.compactPicker}`}
        value={configId}
        onChange={(event) => {
          onSelectConfig(event.target.value);
        }}
      >
        {configs.map((config) => (
          <option key={config.id} value={config.id}>
            {config.name}
          </option>
        ))}
      </select>
      <fieldset className={styles.picker}>
        <legend className={styles.controlLabel}>
          Config{" "}
          <span className={`${styles.controlCount} mono`} aria-hidden="true">
            {configs.length}
          </span>
        </legend>
        <div ref={listRef} className={styles.pickerList}>
          {configs.map((config) => (
            <label key={config.id} className={styles.pickerOption}>
              <input
                type="radio"
                name="search-config"
                value={config.id}
                checked={config.id === configId}
                onChange={() => {
                  onSelectConfig(config.id);
                }}
              />
              <span className={styles.pickerName}>{config.name}</span>
              {config.lastRun ? (
                <RunTally status={config.lastRun.status} tierCounts={config.lastRun.tierCounts} />
              ) : (
                <span className={styles.pickerNever}>Not run yet</span>
              )}
            </label>
          ))}
        </div>
      </fieldset>
      <div className={styles.controlActions}>
        <button
          type="button"
          className="button button-primary button-large"
          aria-disabled={starting || running || undefined}
          onClick={() => {
            if (!starting && !running) onStart(configId);
          }}
        >
          {running ? "Search running…" : starting ? "Starting…" : "Run search"}
        </button>
        <Link href={`/configs/${configId}/edit`} className="button button-large">
          Edit config
        </Link>
      </div>
      {error ? (
        <Notice tone="error" live>
          <p>{error}</p>
        </Notice>
      ) : null}
    </div>
  );
}
