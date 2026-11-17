import Link from "next/link";
import type { SearchConfig, SearchType } from "@/api-client/types";
import { formatRelative, plural } from "@/components/format";
import { EmptyState } from "@/components/ui/states";
import { filterConfigs, type ConfigFilter } from "./filter-configs";
import styles from "./configs.module.css";

interface ConfigListProps {
  configs: readonly SearchConfig[];
  types: readonly SearchType[];
  filter: ConfigFilter;
  busyId: string | null;
  onClearFilter: () => void;
  onRun: (config: SearchConfig) => void;
  onDuplicate: (config: SearchConfig) => void;
  onDelete: (config: SearchConfig) => void;
}

export function ConfigList({ configs, types, filter, busyId, onClearFilter, ...actions }: ConfigListProps) {
  if (configs.length === 0) {
    return (
      <EmptyState
        title="No search configs yet"
        action={
          <Link href="/configs/new" className="button button-primary">
            Create your first config
          </Link>
        }
      >
        A config holds the keywords, places and rules for one kind of lead. Create one, then run it from here
        or from Live search.
      </EmptyState>
    );
  }

  const visible = filterConfigs(configs, filter);
  if (visible.length === 0) {
    return (
      <EmptyState
        title="No configs match these filters"
        action={
          <button type="button" className="button" onClick={onClearFilter}>
            Clear filters
          </button>
        }
      >
        Nothing in {plural(configs.length, "saved config")} matches. Try a shorter word or another search
        type.
      </EmptyState>
    );
  }

  const labelOf = (id: string) => types.find((type) => type.id === id)?.label ?? id;

  return (
    <ul className={styles.list} aria-label="Search configs">
      {visible.map((config) => (
        <li key={config.id} className={styles.row} aria-busy={busyId === config.id || undefined}>
          <div className={styles.summary}>
            <Link href={`/configs/${config.id}/edit`} className={styles.name}>
              {config.name}
            </Link>
            {config.description ? <p className={styles.description}>{config.description}</p> : null}
          </div>
          <dl className={styles.meta}>
            <div>
              <dt>Type</dt>
              <dd>{labelOf(config.type)}</dd>
            </div>
            <div>
              <dt>Keywords</dt>
              <dd className="numeric">{config.criteria.keywords.length}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>
                <time dateTime={config.updatedAt}>{formatRelative(config.updatedAt)}</time>
              </dd>
            </div>
          </dl>
          <div className={styles.actions}>
            <button
              type="button"
              className="button"
              disabled={busyId !== null}
              onClick={() => {
                actions.onRun(config);
              }}
            >
              Run search
            </button>
            <Link href={`/configs/${config.id}/edit`} className="button button-quiet">
              Edit
            </Link>
            <button
              type="button"
              className="button button-quiet"
              disabled={busyId !== null}
              onClick={() => {
                actions.onDuplicate(config);
              }}
            >
              Duplicate
            </button>
            <button
              type="button"
              className="button button-quiet is-danger"
              disabled={busyId !== null}
              onClick={() => {
                actions.onDelete(config);
              }}
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
