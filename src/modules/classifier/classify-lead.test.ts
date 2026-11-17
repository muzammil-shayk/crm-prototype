import { describe, expect, it } from "vitest";
import { classifyLead } from "./classify-lead";

const quote = ["We are looking for an agency to rebuild our patient portal."];

describe("classifyLead", () => {
  it.each([
    [100, "strong"],
    [70, "strong"],
    [69, "medium"],
    [40, "medium"],
    [39, "weak"],
    [0, "weak"],
  ] as const)("scores %i as %s when evidence is quoted", (score, tier) => {
    expect(classifyLead({ score, evidence: quote })).toBe(tier);
  });

  it("forces a high-scoring lead to weak when it has no quoted evidence", () => {
    expect(classifyLead({ score: 95, evidence: [] })).toBe("weak");
  });

  it("treats blank quotes as missing evidence", () => {
    expect(classifyLead({ score: 95, evidence: ["  "] })).toBe("weak");
  });
});
