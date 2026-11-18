import type { SearchConfig as SearchConfigRow } from "@prisma/client";
import { NotFoundError } from "@/lib/errors";
import { parseJsonOrUndefined } from "@/lib/json";
import {
  parseSearchConfigInput,
  searchConfigInputSchema,
  type SearchConfigInput,
} from "@/modules/search-types/registry";
import { runSummariesByConfig, type ConfigRunSummary } from "@/modules/search/config-run-summaries";
import { configRepository } from "./config-repository";
import { copyName } from "./copy-name";

export type SearchConfig = SearchConfigInput & { id: string; createdAt: Date; updatedAt: Date };
export type SearchConfigSummary = SearchConfig & ConfigRunSummary;

const MAX_NAME_LENGTH = 120;

function readStoredConfig(row: SearchConfigRow): SearchConfig | null {
  const parsed = searchConfigInputSchema.safeParse({
    type: row.type,
    name: row.name,
    description: row.description,
    criteria: parseJsonOrUndefined(row.criteria),
  });
  return parsed.success
    ? { ...parsed.data, id: row.id, createdAt: row.createdAt, updatedAt: row.updatedAt }
    : null;
}

const unreadable = (id: string) => `Stored search config ${id} no longer matches its search type.`;

function toSearchConfig(row: SearchConfigRow): SearchConfig {
  const config = readStoredConfig(row);
  if (!config) throw new Error(unreadable(row.id));
  return config;
}

function found(row: SearchConfigRow | null, id: string): SearchConfigRow {
  if (!row) throw new NotFoundError("Search config", id);
  return row;
}

export async function createConfig(input: unknown): Promise<SearchConfig> {
  return toSearchConfig(await configRepository.insert(parseSearchConfigInput(input)));
}

export async function listConfigs(): Promise<SearchConfigSummary[]> {
  const configs: SearchConfig[] = [];
  for (const row of await configRepository.findAll()) {
    const config = readStoredConfig(row);
    if (config) configs.push(config);
    else console.error(unreadable(row.id));
  }
  const summaries = await runSummariesByConfig(configs.map((config) => config.id));
  return configs.map((config) => ({ ...config, lastRun: null, runCount: 0, ...summaries.get(config.id) }));
}

export async function getConfig(id: string): Promise<SearchConfig> {
  return toSearchConfig(found(await configRepository.findById(id), id));
}

export async function updateConfig(id: string, input: unknown): Promise<SearchConfig> {
  return toSearchConfig(found(await configRepository.replace(id, parseSearchConfigInput(input)), id));
}

export async function deleteConfig(id: string): Promise<void> {
  if (!(await configRepository.remove(id))) throw new NotFoundError("Search config", id);
}

export async function duplicateConfig(id: string): Promise<SearchConfig> {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...original } = await getConfig(id);
  const taken = (await configRepository.findAll()).map((row) => row.name);
  const name = copyName(original.name, taken, MAX_NAME_LENGTH);
  return toSearchConfig(await configRepository.insert({ ...original, name }));
}
