import { describe, expect, it } from "vitest";
import { retrievedLead } from "../../../test/retrieved-lead";
import { classify } from "./classify";
import type { EvaluatedLead } from "./pipeline-types";

function evaluated(url: string, score: number, evidence: string[]): EvaluatedLead {
  return {
    ...retrievedLead({ url }),
    score,
    evidence,
    explanation: "",
    matchedOrganizationId: null,
    evaluationError: null,
  };
}

describe("classify", () => {
  it("says why a lead that scored well was forced to weak", () => {
    const [lead] = classify([{ ...evaluated("https://a.example/1", 60, []), explanation: "Mentions dbt." }]);

    expect(lead?.explanation).toBe(
      "Mentions dbt. Marked Weak because no quoted passage from the post backs up the match.",
    );
  });

  it("breaks score ties by company name, then URL", () => {
    const leads = [
      { ...evaluated("https://a.example/2", 80, ["quote"]), company: "Zephyr Labs" },
      { ...evaluated("https://a.example/9", 80, ["quote"]), company: "Acme Clinics" },
      { ...evaluated("https://a.example/1", 80, ["quote"]), company: "Acme Clinics" },
    ];

    expect(classify(leads).map((lead) => lead.url)).toEqual([
      "https://a.example/1",
      "https://a.example/9",
      "https://a.example/2",
    ]);
  });

  it("leaves the explanation alone when the score was weak anyway", () => {
    const [lead] = classify([{ ...evaluated("https://a.example/1", 10, []), explanation: "Off topic." }]);
    expect(lead?.explanation).toBe("Off topic.");
  });

  it("tiers every lead and orders strong first, then by score", () => {
    const leads = [
      evaluated("https://a.example/weak", 20, ["quote"]),
      evaluated("https://a.example/medium", 55, ["quote"]),
      evaluated("https://a.example/no-evidence", 99, []),
      evaluated("https://a.example/strong-low", 71, ["quote"]),
      evaluated("https://a.example/strong-high", 90, ["quote"]),
    ];

    expect(classify(leads).map((lead) => [lead.url.split("/").pop(), lead.tier])).toEqual([
      ["strong-high", "strong"],
      ["strong-low", "strong"],
      ["medium", "medium"],
      ["no-evidence", "weak"],
      ["weak", "weak"],
    ]);
  });
});
