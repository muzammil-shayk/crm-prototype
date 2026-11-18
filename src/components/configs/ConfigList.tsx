import Link from "next/link";
import type { SearchConfigSummary, SearchType } from "@/api-client/types";
import { plural } from "@/components/format";
import { Menu } from "@/components/ui/Menu";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { LastRunCell } from "./LastRunCell";
import { EmptyState } from "@/components/ui/states";
import { filterConfigs, type ConfigFilter } from "./filter-configs";
import styles from "./configs.module.css";

export const configLinkId = (id: string) => `config-${id}`;

interface ConfigListProps {
  configs: readonly SearchConfigSummary[];
  types: readonly SearchType[];
  filter: ConfigFilter;
  busyId: string | null;
  onClearFilter: () => void;
  onRun: (config: SearchConfigSummary) => void;
  onDuplicate: (config: SearchConfigSummary) => void;
  onDelete: (config: SearchConfigSummary) => void;
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
  const busy = busyId !== null;

  return (
    <ul className={styles.list} aria-label="Search configs">
      {visible.map((config) => (
        <li key={config.id} className={styles.row} aria-busy={busyId === config.id || undefined}>
          <div className={styles.summary}>
            <div className={styles.nameRow}>
              <Link id={configLinkId(config.id)} href={`/configs/${config.id}/edit`} className={styles.name}>
                {config.name}
              </Link>
              <span className={styles.typeChip}>{labelOf(config.type)}</span>
            </div>
            {config.description ? <p className={styles.description}>{config.description}</p> : null}
            <p className={styles.facts}>
              <span>{plural(config.criteria.keywords.length, "keyword")}</span>
              {config.runCount > 0 ? <span>{plural(config.runCount, "run")}</span> : null}
              <span>
                Updated <RelativeTime iso={config.updatedAt} />
              </span>
            </p>
          </div>
          <LastRunCell config={config} />
          <div className={styles.actions}>
            <button
              type="button"
              className="button"
              aria-disabled={busy || undefined}
              onClick={() => {
                if (!busy) actions.onRun(config);
              }}
            >
              Run search
            </button>
            <Link href={`/configs/${config.id}/edit`} className="button button-quiet">
              Edit
            </Link>
            <Menu
              label={`More actions for ${config.name}`}
              disabled={busy}
              items={[
                {
                  label: "Duplicate",
                  onSelect: () => {
                    actions.onDuplicate(config);
                  },
                },
                {
                  label: "Delete…",
                  danger: true,
                  onSelect: () => {
                    actions.onDelete(config);
                  },
                },
              ]}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
