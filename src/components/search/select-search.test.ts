import { describe, expect, it } from "vitest";
import type { SearchConfigSummary, SearchRun } from "@/api-client/types";
import { searchUrl, selectSearch, withLiveRun } from "./select-search";

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

describe("selectSearch", () => {
  const saved = [config("c1", lastRun("r1", "2026-11-18T10:00:00Z")), config("c2", null)];
  const want = (configId: string | null, runId: string | null = null) => ({ configId, runId });

  it("opens the chosen config's latest run when the URL names no run", () => {
    const picked = selectSearch(saved, want("c1"));
    expect(picked.config?.id).toBe("c1");
    expect(picked.runId).toBe("r1");
    expect(picked.missing).toBe(false);
  });

  it("keeps a run named in the URL and shows no run for a never-run config", () => {
    expect(selectSearch(saved, want("c1", "r0")).runId).toBe("r0");
    expect(selectSearch(saved, want("c2")).runId).toBeNull();
  });

  it("falls back to the first config and flags a config that no longer exists", () => {
    const gone = selectSearch(saved, want("deleted"));
    expect(gone.config?.id).toBe("c1");
    expect(gone.runId).toBe("r1");
    expect(gone.missing).toBe(true);
    expect(selectSearch(saved, want(null)).missing).toBe(false);
    expect(selectSearch([], want(null)).config).toBeNull();
  });
});

describe("searchUrl", () => {
  it("adds the run only when there is one", () => {
    expect(searchUrl("c1")).toBe("/search?config=c1");
    expect(searchUrl("c1", null)).toBe("/search?config=c1");
    expect(searchUrl("c1", "r1")).toBe("/search?config=c1&run=r1");
  });
});
