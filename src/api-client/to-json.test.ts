import { describe, expect, it } from "vitest";
import { toJson } from "./to-json";

describe("toJson", () => {
  it("turns dates into ISO strings at any depth and leaves other values alone", () => {
    const startedAt = new Date("2026-11-18T10:00:00.000Z");
    const wire = toJson({
      name: "Clinics replacing their patient portal",
      runCount: 3,
      lastRun: { startedAt, finishedAt: null, tierCounts: { strong: 1, medium: 0, weak: 2 } },
      runs: [{ startedAt }],
    });
    expect(wire).toEqual({
      name: "Clinics replacing their patient portal",
      runCount: 3,
      lastRun: {
        startedAt: "2026-11-18T10:00:00.000Z",
        finishedAt: null,
        tierCounts: { strong: 1, medium: 0, weak: 2 },
      },
      runs: [{ startedAt: "2026-11-18T10:00:00.000Z" }],
    });
  });
});
