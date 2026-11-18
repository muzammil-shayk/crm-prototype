import type { EvaluatedLead } from "./pipeline-types";
import { searchRunRepository } from "./search-run-repository";

const RESTARTED = "The server restarted before this search finished.";

export interface ActiveRun {
  controller: AbortController;
  evaluatedSoFar: EvaluatedLead[];
}

interface RunRegistry {
  activeRuns: Map<string, ActiveRun>;
  claimedConfigs: Set<string>;
}

const processWide = globalThis as typeof globalThis & { leadCrmRunRegistry?: RunRegistry };

export const { activeRuns, claimedConfigs } = (processWide.leadCrmRunRegistry ??= {
  activeRuns: new Map<string, ActiveRun>(),
  claimedConfigs: new Set<string>(),
});

export async function failOrphanedRuns(): Promise<void> {
  await searchRunRepository.failAllRunningExcept([...activeRuns.keys()], RESTARTED);
}
