import Link from "next/link";
import { useEffect, useRef } from "react";
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

  useEffect(() => {
    const list = listRef.current;
    const option = list?.querySelector("input:checked")?.closest("label");
    if (!list || !option) return;
    const { offsetTop: top, offsetHeight: height } = option;
    if (top < list.scrollTop || top + height > list.scrollTop + list.clientHeight) {
      list.scrollTop = top - (list.clientHeight - height) / 2;
    }
  }, [configId]);

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
