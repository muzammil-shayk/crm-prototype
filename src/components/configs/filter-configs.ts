import type { SearchConfig } from "@/api-client/types";

export interface ConfigFilter {
  text: string;
  type: string;
}

export const NO_FILTER: ConfigFilter = { text: "", type: "" };

export function filterConfigs<Config extends SearchConfig>(
  configs: readonly Config[],
  { text, type }: ConfigFilter,
): Config[] {
  const needle = text.trim().toLowerCase();
  return configs.filter((config) => {
    if (type && config.type !== type) return false;
    if (!needle) return true;
    const haystack = [config.name, config.description, ...config.criteria.keywords].join("\n").toLowerCase();
    return haystack.includes(needle);
  });
}

export function focusAfterRemoval(visibleIds: readonly string[], removedId: string): string | null {
  const index = visibleIds.indexOf(removedId);
  if (index === -1) return null;
  return visibleIds[index + 1] ?? visibleIds[index - 1] ?? null;
}
