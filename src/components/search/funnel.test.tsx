// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { RunStats, SearchConfigSummary, SearchRun } from "@/api-client/types";
import { latestRunElsewhere } from "./LatestRun";
import { runFunnel, share } from "./funnel";
import { RunFunnel } from "./RunFunnel";

afterEach(cleanup);

const stats: RunStats = {
  queries: 6,
  queryFailures: 0,
  retrieved: 23,
  duplicates: 13,
  excluded: 1,
  outsideFilters: 2,
  outsideLocation: 2,
  outsideIndustry: 0,
  evaluated: 7,
  evaluationFailures: 0,
  costUnits: 13,
};

const finished = {
  status: "completed",
  stage: "classifying",
  tierCounts: { strong: 4, medium: 2, weak: 1 },
} as const;

const run = (patch: Partial<SearchRun>): SearchRun => ({
  id: "run-1",
  configId: "cfg-1",
  configName: "Data and cloud contracts for our studios",
  configType: "jobs-matching-organizations",
  progress: 100,
  stats,
  limitsHit: [],
  warnings: [],
  error: null,
  startedAt: "2026-11-18T10:00:00.000Z",
  finishedAt: "2026-11-18T10:00:05.000Z",
  ...finished,
  ...patch,
});

describe("runFunnel", () => {
  it("narrows from posts fetched to leads scored, shedding each filter's count on the way", () => {
    const funnel = runFunnel(stats, finished);
    expect(funnel.steps.map(({ key, count, shed }) => [key, count, shed.map((part) => part.count)])).toEqual([
      ["fetched", 23, []],
      ["unique", 10, [13]],
      ["kept", 9, [1]],
      ["inFilters", 7, [2]],
      ["scored", 7, []],
    ]);
    expect(funnel.scale).toBe(23);
    expect(funnel.tiers).toEqual([
      { tier: "strong", count: 4 },
      { tier: "medium", count: 2 },
      { tier: "weak", count: 1 },
    ]);
  });

  it("keeps every step's kept and shed share inside the step before it", () => {
    const funnel = runFunnel(stats, finished);
    funnel.steps.slice(1).forEach((step, index) => {
      const before = funnel.steps[index]?.count ?? 0;
      const shed = step.shed.reduce((sum, part) => sum + part.count, 0);
      expect((step.count ?? 0) + shed + step.queued).toBe(before);
    });
    expect(share(23, funnel.scale)).toBe(1);
    expect(share(null, funnel.scale)).toBe(0);
    expect(share(40, funnel.scale)).toBe(1);
  });

  it("names location and industry drops apart, or together for older runs", () => {
    const split = runFunnel(
      { ...stats, outsideFilters: 5, outsideLocation: 2, outsideIndustry: 3 },
      finished,
    );
    expect(split.steps[3]?.shed.map((part) => part.label)).toEqual([
      "outside your locations",
      "outside your industries",
    ]);
    const legacy = runFunnel(
      { ...stats, outsideFilters: 5, outsideLocation: 0, outsideIndustry: 0 },
      finished,
    );
    expect(legacy.steps[3]?.shed).toEqual([{ count: 5, label: "outside your filters" }]);
  });

  it("shows posts past the scoring limit as shed once the run is over", () => {
    const capped = runFunnel({ ...stats, evaluated: 5 }, finished);
    expect(capped.steps[4]?.shed).toEqual([{ count: 2, label: "not scored, run limit" }]);
  });

  it("leaves later steps empty while the run is still fetching", () => {
    const funnel = runFunnel(
      { ...stats, retrieved: 0, evaluated: 0 },
      { ...finished, status: "running", stage: "retrieving" },
    );
    expect(funnel.queries).toBe(6);
    expect(funnel.steps.map((step) => step.count)).toEqual([null, null, null, null, null]);
    expect(funnel.tiers).toBeNull();
  });

  it("counts posts waiting to be scored as queued, not shed, during scoring", () => {
    const funnel = runFunnel(
      { ...stats, evaluated: 3 },
      { ...finished, status: "running", stage: "evaluating" },
    );
    expect(funnel.steps[4]).toMatchObject({ count: 3, queued: 4, shed: [] });
    expect(funnel.tiers).toBeNull();
  });

  it("marks where a cancelled run stopped and keeps the leads it scored", () => {
    const funnel = runFunnel(
      { ...stats, retrieved: 0 },
      { status: "cancelled", stage: "retrieving", tierCounts: { strong: 1, medium: 0, weak: 0 } },
    );
    expect(funnel.stoppedAt).toBe("fetched");
    expect(funnel.tiers?.[0]).toEqual({ tier: "strong", count: 1 });
  });
});

describe("RunFunnel", () => {
  it("is an ordered list of steps with every number written out", () => {
    render(<RunFunnel run={run({})} />);
    const figure = screen.getByRole("figure", { name: "How 23 posts became 7 leads" });
    const steps = within(figure).getAllByRole("listitem");
    expect(steps.map((step) => step.querySelector("[class*=label]")?.textContent)).toEqual([
      "Fetched",
      "Unique",
      "No excluded words",
      "Inside filters",
      "Scored",
    ]);
    expect(steps[1]?.textContent).toContain("−13 duplicates");
    expect(steps[3]?.textContent).toContain("−2 outside your locations");
    expect(steps[4]?.textContent).toContain("Strong 4");
    expect(within(figure).getByText("6 queries, 13 provider calls")).toBeTruthy();
    expect(figure.querySelectorAll("[aria-hidden=true]").length).toBeGreaterThan(0);
  });

  it("sizes each band from the shared scale", () => {
    render(<RunFunnel run={run({})} />);
    const unique = screen.getByText("Unique").closest("li");
    expect(unique?.style.getPropertyValue("--kept")).toBe(String(10 / 23));
    expect(unique?.style.getPropertyValue("--shed")).toBe(String(13 / 23));
  });

  it("keeps pending steps quiet and readable while the run works", () => {
    render(<RunFunnel run={run({ status: "running", stage: "retrieving", finishedAt: null })} />);
    const fetched = screen.getByText("Fetched").closest("li");
    expect(fetched?.getAttribute("data-state")).toBe("pending");
    expect(fetched?.textContent).toContain("Not counted yet");
    expect(fetched?.textContent).not.toContain("Cancelled here");
  });
});

describe("latestRunElsewhere", () => {
  const summary = (id: string, startedAt: string | null, status: SearchRun["status"] = "completed") =>
    ({
      id,
      name: id,
      lastRun: startedAt
        ? { id: `run-${id}`, status, startedAt, finishedAt: startedAt, tierCounts: finished.tierCounts }
        : null,
    }) as unknown as SearchConfigSummary;

  it("picks the newest finished run from another config", () => {
    const configs = [
      summary("a", "2026-11-18T09:00:00.000Z"),
      summary("b", "2026-11-18T11:00:00.000Z"),
      summary("c", "2026-11-18T12:00:00.000Z", "running"),
      summary("d", null),
    ];
    expect(latestRunElsewhere(configs, "d")?.runId).toBe("run-b");
    expect(latestRunElsewhere(configs, "b")?.runId).toBe("run-a");
    expect(latestRunElsewhere([summary("d", null)], "d")).toBeNull();
  });
});
