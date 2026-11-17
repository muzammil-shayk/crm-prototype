import type { SearchConfig } from "@/api-client/types";

export interface ConfigFilter {
  text: string;
  type: string;
}

export const NO_FILTER: ConfigFilter = { text: "", type: "" };

export function filterConfigs(
  configs: readonly SearchConfig[],
  { text, type }: ConfigFilter,
): SearchConfig[] {
  const needle = text.trim().toLowerCase();
  return configs.filter((config) => {
    if (type && config.type !== type) return false;
    if (!needle) return true;
    const haystack = [config.name, config.description, ...config.criteria.keywords].join("\n").toLowerCase();
    return haystack.includes(needle);
  });
}
