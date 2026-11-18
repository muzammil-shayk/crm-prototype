// @vitest-environment happy-dom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Lead, SearchConfigSummary, SearchRun } from "@/api-client/types";
import { stubFetch } from "../../../test/ui/fake-api";
import { LiveSearch } from "./LiveSearch";
import { POLL_INTERVAL_MS } from "./use-run-polling";

const config: SearchConfigSummary = {
  id: "cfg-portal",
  type: "buyers-seeking-providers",
  name: "Clinics replacing their patient portal",
  description: "",
  criteria: { keywords: ["patient portal"], excludedKeywords: [], industries: [], locations: [], rules: "" },
  createdAt: "2026-11-18T09:00:00.000Z",
  updatedAt: "2026-11-18T09:00:00.000Z",
  lastRun: null,
  runCount: 1,
};

const run = (patch: Partial<SearchRun>): SearchRun => ({
  id: "run-1",
  configId: config.id,
  configName: config.name,
  configType: config.type,
  status: "running",
  stage: "retrieving",
  progress: 30,
  stats: {
    queries: 1,
    queryFailures: 0,
    retrieved: 0,
    duplicates: 0,
    excluded: 0,
    outsideFilters: 0,
    outsideLocation: 0,
    outsideIndustry: 0,
    evaluated: 0,
    evaluationFailures: 0,
    costUnits: 1,
  },
  limitsHit: [],
  warnings: [],
  error: null,
  startedAt: "2026-11-18T10:00:00.000Z",
  finishedAt: null,
  tierCounts: { strong: 0, medium: 0, weak: 0 },
  ...patch,
});

const keptLead: Lead = {
  id: "lead-1",
  runId: "run-1",
  url: "https://forum.example.org/t/portal",
  title: "Physio chain wants online booking for six clinics",
  source: "Practice Owners Forum",
  company: "Northbank Physio",
  location: "Leeds",
  industry: "healthcare",
  publishedAt: "2026-11-12T08:30:00.000Z",
  body: "We want patients to book online across all six clinics before March.",
  budgetUsd: null,
  engagementType: null,
  score: 74,
  tier: "strong",
  explanation: "Names the work and a deadline.",
  evidence: ["book online across all six clinics"],
  evaluationError: null,
  matchedOrganization: null,
  status: "new",
  createdAt: "2026-11-18T10:00:02.000Z",
};

function serve(snapshots: SearchRun[], cancelled?: SearchRun, configs = [config]) {
  let polls = 0;
  let current: SearchRun | undefined;
  return stubFetch((url, init) => {
    if (url.pathname === "/api/configs") return { body: { configs } };
    if (url.pathname === "/api/search-types") return { body: { searchTypes: [] } };
    if (url.pathname === "/api/searches") return { body: { runs: [] } };
    if (url.pathname === "/api/searches/run-1/cancel" && init?.method === "POST" && cancelled) {
      current = cancelled;
      return { body: { run: cancelled } };
    }
    if (url.pathname === "/api/searches/run-1") {
      current = current?.status === "cancelled" ? current : snapshots[Math.min(polls, snapshots.length - 1)];
      polls += 1;
      return { body: { run: current, leads: current?.status === "cancelled" ? [keptLead] : [] } };
    }
    return { status: 404, body: { error: { code: "not_found", message: "No such route" } } };
  });
}

const settle = (ms = 0) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("LiveSearch polling", () => {
  it("polls while the run is running, shows progress, and stops once it finishes", async () => {
    const api = serve([
      run({ progress: 30 }),
      run({ stage: "evaluating", progress: 70 }),
      run({
        status: "completed",
        stage: "classifying",
        progress: 100,
        finishedAt: "2026-11-18T10:00:04.000Z",
        tierCounts: { strong: 2, medium: 1, weak: 3 },
      }),
    ]);
    render(<LiveSearch initialConfigId={config.id} initialRunId="run-1" />);
    await settle();

    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("30");
    await settle(POLL_INTERVAL_MS);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("70");
    expect(screen.getByText("Scoring leads…")).toBeTruthy();

    await settle(POLL_INTERVAL_MS);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByText("Search completed. 6 leads: 2 Strong, 1 Medium, 3 Weak.")).toBeTruthy();

    await settle(POLL_INTERVAL_MS * 10);
    expect(api.count("GET", "/api/searches/run-1")).toBe(3);
  });

  it("cancels a running search, keeps focus on the run, and stops polling", async () => {
    const api = serve(
      [run({})],
      run({
        status: "cancelled",
        finishedAt: "2026-11-18T10:00:02.000Z",
        tierCounts: { strong: 1, medium: 0, weak: 0 },
      }),
    );
    render(<LiveSearch initialConfigId={config.id} initialRunId="run-1" />);
    await settle();

    const cancel = screen.getByRole("button", { name: "Cancel search" });
    expect(cancel.getAttribute("aria-describedby")).toBe("cancel-hint");
    expect(screen.getByText("Leads already scored are kept")).toBeTruthy();
    cancel.focus();
    await act(async () => {
      cancel.click();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(api.count("POST", "/api/searches/run-1/cancel")).toBe(1);
    expect(screen.queryByRole("button", { name: "Cancel search" })).toBeNull();
    await settle(POLL_INTERVAL_MS);
    expect(screen.getByText("Cancelled. Kept 1 lead that was scored before you stopped.")).toBeTruthy();
    expect(screen.getByText(keptLead.title)).toBeTruthy();
    expect(screen.queryByText("Posts fetched")).toBeNull();
    expect(document.activeElement?.textContent).toBe(config.name);

    const pollsAfterCancel = api.count("GET", "/api/searches/run-1");
    await settle(POLL_INTERVAL_MS * 10);
    expect(api.count("GET", "/api/searches/run-1")).toBeLessThanOrEqual(pollsAfterCancel + 1);
  });

  it("keeps retrying after a network error and says so", async () => {
    let failures = 1;
    stubFetch((url) => {
      if (url.pathname === "/api/configs") return { body: { configs: [config] } };
      if (url.pathname === "/api/search-types") return { body: { searchTypes: [] } };
      if (url.pathname === "/api/searches") return { body: { runs: [] } };
      if (failures > 0) {
        failures -= 1;
        return { status: 503, body: { error: { code: "internal_error", message: "Down" } } };
      }
      return { body: { run: run({ progress: 50 }), leads: [] } };
    });
    render(<LiveSearch initialConfigId={config.id} initialRunId="run-1" />);
    await settle();
    expect(screen.queryByRole("progressbar")).toBeNull();

    await settle(2000);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("50");
  });
});

describe("LiveSearch opening a config", () => {
  it("loads the config's latest run without an extra click and puts it in the URL", async () => {
    window.history.replaceState(null, "", `/search?config=${config.id}`);
    const finished = run({ status: "completed", progress: 100, finishedAt: "2026-11-18T10:00:04.000Z" });
    const { id, status, startedAt, finishedAt, tierCounts } = finished;
    const api = serve([finished], undefined, [
      { ...config, lastRun: { id, status, startedAt, finishedAt, tierCounts } },
    ]);
    render(<LiveSearch initialConfigId={config.id} initialRunId={null} />);
    await settle();

    expect(api.count("GET", "/api/searches/run-1")).toBe(1);
    expect(screen.getByText("Finished, but no posts matched this config.")).toBeTruthy();
    expect(screen.queryByText("What a search does")).toBeNull();
    expect(window.location.search).toBe(`?config=${config.id}&run=run-1`);
  });

  it("shows what a search does only for a config that has never run", async () => {
    window.history.replaceState(null, "", `/search?config=${config.id}`);
    const api = serve([]);
    render(<LiveSearch initialConfigId={config.id} initialRunId={null} />);
    await settle();

    expect(screen.getByText("What a search does")).toBeTruthy();
    expect(api.calls.some((call) => call.path.startsWith("/api/searches/"))).toBe(false);
    expect(window.location.search).toBe(`?config=${config.id}`);
  });
});
