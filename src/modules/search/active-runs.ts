import { searchRunRepository } from "./search-run-repository";

const RESTARTED = "The server restarted before this search finished.";

interface RunRegistry {
  activeRuns: Map<string, AbortController>;
  claimedConfigs: Set<string>;
}

const processWide = globalThis as typeof globalThis & { leadCrmRunRegistry?: RunRegistry };

export const { activeRuns, claimedConfigs } = (processWide.leadCrmRunRegistry ??= {
  activeRuns: new Map<string, AbortController>(),
  claimedConfigs: new Set<string>(),
});

export async function failOrphanedRuns(): Promise<void> {
  await searchRunRepository.failAllRunningExcept([...activeRuns.keys()], RESTARTED);
}
