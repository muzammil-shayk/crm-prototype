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

function markOverflow(list: HTMLElement) {
  const hidden = list.scrollHeight - list.clientHeight - list.scrollTop;
  list.toggleAttribute("data-more-below", hidden > 1);
  list.toggleAttribute("data-more-above", list.scrollTop > 1);
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
    const option = list?.querySelector("input:checked")?.parentElement;
    if (!list || !option) return;
    const fade = parseFloat(getComputedStyle(list).getPropertyValue("--fade")) || 0;
    const top = option.offsetTop - fade;
    const bottom = option.offsetTop + option.offsetHeight + fade;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
    markOverflow(list);
  }, [configId]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      markOverflow(list);
    });
    observer.observe(list);
    return () => {
      observer.disconnect();
    };
  }, []);

  if (!configId) {
    return (
      <EmptyState
        title="No configs to run"
        action={
          <Link href="/configs/new" className="button button-primary">
            Create a config
          </Link>
        }
      >
        Live search runs a saved config. Create one first.
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
        <legend className={styles.controlLabel}>Config</legend>
        <div
          ref={listRef}
          className={styles.pickerList}
          onScroll={(event) => {
            markOverflow(event.currentTarget);
          }}
        >
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
