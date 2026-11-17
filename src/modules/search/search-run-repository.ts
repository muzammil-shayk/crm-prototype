import type { SearchRun as SearchRunRow } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseJsonOrUndefined, parseStringList } from "@/lib/json";
import { leadRowsFor } from "@/modules/leads/lead-repository";
import { RUN_STAGES, type LimitHit, type RunStage, type RunStats } from "./pipeline-types";
import type { RunProgress, SearchOutcome } from "./run-search";

export const RUN_STATUSES = ["running", "completed", "partial", "failed", "cancelled"] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export interface SearchRun {
  id: string;
  configId: string | null;
  configName: string;
  configType: string;
  status: RunStatus;
  stage: RunStage;
  progress: number;
  stats: RunStats;
  limitsHit: LimitHit[];
  warnings: string[];
  error: string | null;
  startedAt: Date;
  finishedAt: Date | null;
}

const count = z.number().int().nonnegative().catch(0);
const statsSchema = z.object({
  queries: count,
  queryFailures: count,
  retrieved: count,
  duplicates: count,
  excluded: count,
  evaluated: count,
  evaluationFailures: count,
  costUnits: count,
});
const limitsSchema = z.array(z.enum(["max_queries", "max_leads", "max_cost_units"])).catch([]);

function toSearchRun({ configHash: _hash, ...row }: SearchRunRow): SearchRun {
  return {
    ...row,
    status: RUN_STATUSES.find((status) => status === row.status) ?? "failed",
    stage: RUN_STAGES.find((stage) => stage === row.stage) ?? "generating_queries",
    stats: statsSchema.parse(parseJsonOrUndefined(row.stats) ?? {}),
    limitsHit: limitsSchema.parse(parseJsonOrUndefined(row.limitsHit)),
    warnings: parseStringList(row.warnings),
  };
}

const stillRunning = (id: string) => ({ id, status: "running" });

export const searchRunRepository = {
  async create(run: {
    id: string;
    configId: string;
    configName: string;
    configType: string;
    configHash: string;
  }) {
    return toSearchRun(
      await db.searchRun.create({ data: { ...run, status: "running", stage: RUN_STAGES[0] } }),
    );
  },

  async findById(id: string): Promise<SearchRun | null> {
    const row = await db.searchRun.findUnique({ where: { id } });
    return row ? toSearchRun(row) : null;
  },

  async findMany(filter: { configId?: string }): Promise<SearchRun[]> {
    const rows = await db.searchRun.findMany({
      where: filter,
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    });
    return rows.map(toSearchRun);
  },

  async hasRunningRun(configId: string): Promise<boolean> {
    return (await db.searchRun.count({ where: { configId, status: "running" } })) > 0;
  },

  async recordProgress(id: string, { stage, progress }: RunProgress): Promise<void> {
    await db.searchRun.updateMany({ where: stillRunning(id), data: { stage, progress } });
  },

  async finish(id: string, outcome: SearchOutcome): Promise<void> {
    await db.$transaction(async (tx) => {
      const { count: updated } = await tx.searchRun.updateMany({
        where: stillRunning(id),
        data: {
          status: outcome.status,
          progress: 100,
          stats: JSON.stringify(outcome.stats),
          limitsHit: JSON.stringify(outcome.limitsHit),
          warnings: JSON.stringify(outcome.warnings),
          error: outcome.error,
          finishedAt: new Date(),
        },
      });
      if (updated === 1) await tx.lead.createMany({ data: leadRowsFor(id, outcome.leads) });
    });
  },

  async stop(id: string, status: "cancelled" | "failed", error: string | null): Promise<boolean> {
    const { count: updated } = await db.searchRun.updateMany({
      where: stillRunning(id),
      data: { status, error, finishedAt: new Date() },
    });
    return updated === 1;
  },

  async failAllRunningExcept(liveIds: string[], error: string): Promise<void> {
    await db.searchRun.updateMany({
      where: { status: "running", id: { notIn: liveIds } },
      data: { status: "failed", error, finishedAt: new Date() },
    });
  },
};
