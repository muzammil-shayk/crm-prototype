import { describe, expect, it } from "vitest";
import { COUNT_UP_MS, countAt, countBetween, FOLLOW_MS } from "./CountUp";

describe("countAt", () => {
  it("starts at zero and lands exactly on the target", () => {
    expect(countAt(23, 0)).toBe(0);
    expect(countAt(23, COUNT_UP_MS)).toBe(23);
    expect(countAt(23, COUNT_UP_MS * 4)).toBe(23);
  });

  it("holds at zero while a step is still waiting for its turn", () => {
    expect(countAt(13, -220)).toBe(0);
  });

  it("eases out: most of the count arrives in the first half, and it never overshoots", () => {
    expect(countAt(100, COUNT_UP_MS / 2)).toBe(88);
    const samples = Array.from({ length: 31 }, (_, step) => countAt(100, (COUNT_UP_MS * step) / 30));
    expect(samples.every((value, index) => index === 0 || value >= (samples[index - 1] ?? 0))).toBe(true);
    expect(Math.max(...samples)).toBe(100);
  });
});

describe("countBetween", () => {
  it("carries a live count on from the last value to the next one", () => {
    expect(countBetween(12, 20, 0, FOLLOW_MS)).toBe(12);
    expect(countBetween(12, 20, FOLLOW_MS, FOLLOW_MS)).toBe(20);
    const samples = Array.from({ length: 11 }, (_, step) =>
      countBetween(12, 20, (FOLLOW_MS * step) / 10, FOLLOW_MS),
    );
    expect(samples.every((value, index) => value >= (samples[index - 1] ?? 12) && value <= 20)).toBe(true);
  });
});
