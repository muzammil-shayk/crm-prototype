import type { SearchType } from "@/api-client/types";
import { SearchIcon } from "@/components/ui/icons";
import type { ConfigFilter } from "./filter-configs";
import styles from "./configs.module.css";

interface ConfigFiltersProps {
  filter: ConfigFilter;
  types: readonly SearchType[];
  onChange: (filter: ConfigFilter) => void;
}

export function ConfigFilters({ filter, types, onChange }: ConfigFiltersProps) {
  return (
    <search className={styles.filters}>
      <div className={styles.searchBox}>
        <label htmlFor="config-filter-text" className="visually-hidden">
          Filter by name, description or keyword
        </label>
        <span className={styles.searchIcon}>
          <SearchIcon />
        </span>
        <input
          id="config-filter-text"
          type="search"
          className="input"
          placeholder="Filter configs"
          value={filter.text}
          onChange={(event) => {
            onChange({ ...filter, text: event.target.value });
          }}
        />
      </div>
      <label htmlFor="config-filter-type" className="visually-hidden">
        Search type
      </label>
      <select
        id="config-filter-type"
        className={`input ${styles.typeSelect}`}
        value={filter.type}
        onChange={(event) => {
          onChange({ ...filter, type: event.target.value });
        }}
      >
        <option value="">All search types</option>
        {types.map((type) => (
          <option key={type.id} value={type.id}>
            {type.label}
          </option>
        ))}
      </select>
    </search>
  );
}
