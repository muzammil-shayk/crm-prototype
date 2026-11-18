import { describe, expect, it } from "vitest";
import type { SearchRun } from "@/api-client/types";
import { mergeRun, shownRunCount } from "./RunHistory";
import { runExplanations } from "./RunOutcome";
import { tallyLabel } from "./TierBar";

describe("mergeRun", () => {
  const run = (id: string, status: SearchRun["status"]) => ({ id, status }) as SearchRun;

  it("replaces a listed run with its live copy, or puts a new run first", () => {
    expect(mergeRun([run("a", "running")], run("a", "completed"))).toEqual([run("a", "completed")]);
    expect(mergeRun([run("a", "completed")], run("b", "running")).map((item) => item.id)).toEqual(["b", "a"]);
  });
});

describe("shownRunCount", () => {
  it("shows the latest page, grows by page, and never hides the selected run", () => {
    expect(shownRunCount(25, 10, -1)).toBe(10);
    expect(shownRunCount(25, 20, 3)).toBe(20);
    expect(shownRunCount(25, 10, 17)).toBe(18);
    expect(shownRunCount(4, 10, -1)).toBe(4);
  });
});

describe("runExplanations", () => {
  const failed = (warnings: string[]) =>
    ({ limitsHit: [], warnings, stats: { queryFailures: 1, evaluationFailures: 1 } }) as unknown as SearchRun;

  it("points to the warnings only when there are some", () => {
    expect(runExplanations(failed(["Query 2 timed out"]))).toEqual([
      "2 provider calls failed after retries. Details below.",
    ]);
    expect(runExplanations(failed([]))).toEqual(["2 provider calls failed after retries."]);
  });
});

describe("tallyLabel", () => {
  const none = { strong: 0, medium: 0, weak: 0 };
  const some = { strong: 1, medium: 2, weak: 0 };

  it("says how many leads a cancelled run kept", () => {
    expect(tallyLabel("cancelled", some)).toBe("Cancelled, 3 leads kept");
    expect(tallyLabel("cancelled", { ...none, weak: 1 })).toBe("Cancelled, 1 lead kept");
    expect(tallyLabel("cancelled", none)).toBe("Cancelled, no leads kept");
  });

  it("summarises finished runs and explains empty ones", () => {
    expect(tallyLabel("completed", some)).toBe("3 leads, 1 strong");
    expect(tallyLabel("completed", none)).toBe("No leads matched");
    expect(tallyLabel("failed", none)).toBe("No leads saved");
    expect(tallyLabel("running", none)).toBe("Scoring in progress");
  });
});
