import { describe, expect, it } from "vitest";
import type { SearchConfigSummary, SearchRun } from "@/api-client/types";
import { withLiveRun } from "./live-run";

const counts = { strong: 1, medium: 2, weak: 3 };
const lastRun = (id: string, startedAt: string) =>
  ({ id, status: "completed", startedAt, finishedAt: startedAt, tierCounts: counts }) as const;
const config = (id: string, last: ReturnType<typeof lastRun> | null) =>
  ({ id, lastRun: last }) as SearchConfigSummary;
const run = (id: string, configId: string, startedAt: string) =>
  ({
    id,
    configId,
    status: "running",
    startedAt,
    finishedAt: null,
    tierCounts: { strong: 0, medium: 0, weak: 0 },
  }) as SearchRun;

describe("withLiveRun", () => {
  it("makes a newer run the config's last run", () => {
    const [updated] = withLiveRun(
      [config("c1", lastRun("r1", "2026-11-18T10:00:00Z"))],
      run("r2", "c1", "2026-11-18T11:00:00Z"),
    );
    expect(updated?.lastRun?.id).toBe("r2");
  });

  it("refreshes the same run in place", () => {
    const [updated] = withLiveRun(
      [config("c1", lastRun("r1", "2026-11-18T10:00:00Z"))],
      run("r1", "c1", "2026-11-18T10:00:00Z"),
    );
    expect(updated?.lastRun?.status).toBe("running");
  });

  it("ignores an older run and runs of other configs", () => {
    const configs = [config("c1", lastRun("r3", "2026-11-18T12:00:00Z")), config("c2", null)];
    expect(withLiveRun(configs, run("r1", "c1", "2026-11-18T10:00:00Z"))).toEqual(configs);
    expect(withLiveRun(configs, run("r9", "c9", "2026-11-18T13:00:00Z"))).toEqual(configs);
  });

  it("gives a never-run config its first run", () => {
    const [updated] = withLiveRun([config("c2", null)], run("r1", "c2", "2026-11-18T10:00:00Z"));
    expect(updated?.lastRun?.id).toBe("r1");
  });
});
