import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { recordIdSchema } from "@/lib/record-id";
import { stableHash } from "@/lib/stable-hash";
import { getConfig } from "@/modules/configs/config-service";
import { leadRepository, type Lead } from "@/modules/leads/lead-repository";
import { listOrganizations } from "@/modules/organizations/organization-repository";
import type { SearchConfigInput } from "@/modules/search-types/registry";
import { activeRuns, claimedConfigs, failOrphanedRuns, type ActiveRun } from "./active-runs";
import { classify } from "./classify";
import { runSearch, type RunProgress, type SearchDependencies } from "./run-search";
import { defaultSearchDependencies } from "./search-dependencies";
import { searchRunRepository, type SearchRun } from "./search-run-repository";

const UNEXPECTED = "The search stopped because of an unexpected error. Try running it again.";

const alreadyRunning = () =>
  new ConflictError("run_in_progress", "A search for this config is already running.");

const runListQuerySchema = z.strictObject({ configId: recordIdSchema.optional() });

async function requireRun(id: string): Promise<SearchRun> {
  const run = await searchRunRepository.findById(id);
  if (!run) throw new NotFoundError("Search run", id);
  return run;
}

function progressWriter(runId: string) {
  let last = "";
  let writes = Promise.resolve();
  return {
    push: (update: RunProgress) => {
      const key = `${update.stage}:${update.progress}`;
      if (key === last) return;
      last = key;
      writes = writes.then(() => searchRunRepository.recordProgress(runId, update)).catch(console.error);
    },
    flush: () => writes,
  };
}

async function executeRun(
  runId: string,
  config: SearchConfigInput,
  configHash: string,
  deps: SearchDependencies,
  { controller: { signal }, evaluatedSoFar }: ActiveRun,
) {
  const progress = progressWriter(runId);
  try {
    const organizations = await listOrganizations();
    const outcome = await runSearch({ config, organizations, configHash }, deps, {
      signal,
      onProgress: progress.push,
      onLeadEvaluated: (lead) => evaluatedSoFar.push(lead),
    });
    await progress.flush();
    await searchRunRepository.finish(runId, outcome);
  } catch (error) {
    await progress.flush();
    if (signal.aborted) return;
    console.error(error);
    await searchRunRepository.stop(runId, "failed", UNEXPECTED);
  }
}

async function launchRun(configId: string, deps: SearchDependencies): Promise<SearchRun> {
  const { id, createdAt: _created, updatedAt: _updated, ...config } = await getConfig(configId);
  await failOrphanedRuns();
  if (await searchRunRepository.hasRunningRun(id)) throw alreadyRunning();

  const runId = randomUUID();
  const active: ActiveRun = { controller: new AbortController(), evaluatedSoFar: [] };
  activeRuns.set(runId, active);
  const configHash = stableHash({
    type: config.type,
    description: config.description,
    criteria: config.criteria,
  });
  try {
    const run = await searchRunRepository.create({
      id: runId,
      configId: id,
      configName: config.name,
      configType: config.type,
      configHash,
    });
    void executeRun(run.id, config, configHash, deps, active)
      .catch(console.error)
      .finally(() => {
        activeRuns.delete(runId);
        claimedConfigs.delete(configId);
      });
    return run;
  } catch (error) {
    activeRuns.delete(runId);
    throw error;
  }
}

export async function startSearch(
  configId: string,
  deps: SearchDependencies = defaultSearchDependencies(),
): Promise<SearchRun> {
  if (claimedConfigs.has(configId)) throw alreadyRunning();
  claimedConfigs.add(configId);
  try {
    return await launchRun(configId, deps);
  } catch (error) {
    claimedConfigs.delete(configId);
    throw error;
  }
}

export async function getSearchRun(id: string): Promise<{ run: SearchRun; leads: Lead[] }> {
  await failOrphanedRuns();
  const run = await requireRun(id);
  return { run, leads: await leadRepository.findMany({ runId: id }) };
}

export async function listSearchRuns(query: unknown): Promise<SearchRun[]> {
  const filter = runListQuerySchema.parse(query);
  await failOrphanedRuns();
  return searchRunRepository.findMany(filter);
}

export async function cancelSearch(id: string): Promise<SearchRun> {
  await failOrphanedRuns();
  const run = await requireRun(id);
  const active = activeRuns.get(id);
  const leadsSoFar = classify(active?.evaluatedSoFar ?? []);
  const stopped =
    run.status === "running" && (await searchRunRepository.stop(id, "cancelled", null, leadsSoFar));
  if (!stopped) {
    const { status } = await requireRun(id);
    throw new ConflictError("run_not_cancellable", `This search has already finished (${status}).`);
  }
  active?.controller.abort();
  return requireRun(id);
}
