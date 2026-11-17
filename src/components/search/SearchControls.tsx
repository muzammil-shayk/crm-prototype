"use client";

import Link from "next/link";
import { useState } from "react";
import { describeApiError } from "@/api-client/api-error";
import type { SearchConfig, SearchRun, SearchType } from "@/api-client/types";
import { plural } from "@/components/format";
import { EmptyState, Notice } from "@/components/ui/states";
import { startOrResumeSearch } from "./start-search";
import styles from "./search.module.css";

interface SearchControlsProps {
  configs: readonly SearchConfig[];
  types: readonly SearchType[];
  configId: string | null;
  currentRun: SearchRun | null;
  onSelectConfig: (configId: string) => void;
  onStarted: (configId: string, runId: string) => void;
}

export function SearchControls({ configs, types, configId, currentRun, ...handlers }: SearchControlsProps) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const config = configs.find((item) => item.id === configId);

  if (!config) {
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

  const running = currentRun?.status === "running" && currentRun.configId === config.id;
  const typeLabel = types.find((type) => type.id === config.type)?.label;

  const start = async () => {
    setStarting(true);
    setError(null);
    try {
      const run = await startOrResumeSearch(config.id);
      handlers.onStarted(config.id, run.id);
    } catch (problem) {
      setError(describeApiError(problem));
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className={styles.controls}>
      <label htmlFor="search-config" className={styles.controlLabel}>
        Config
      </label>
      <select
        id="search-config"
        className="input"
        value={config.id}
        onChange={(event) => {
          setError(null);
          handlers.onSelectConfig(event.target.value);
        }}
      >
        {configs.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <p className={styles.configSummary}>
        {typeLabel ? <span>{typeLabel}</span> : null}
        <span>{plural(config.criteria.keywords.length, "keyword")}</span>
        <Link href={`/configs/${config.id}/edit`}>Edit config</Link>
      </p>
      <button
        type="button"
        className="button button-primary button-large"
        disabled={starting || running}
        onClick={() => void start()}
      >
        {running ? "Search running…" : starting ? "Starting…" : "Search"}
      </button>
      {error ? (
        <Notice tone="error" live>
          <p>{error}</p>
        </Notice>
      ) : null}
    </div>
  );
}
