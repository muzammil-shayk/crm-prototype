import { describe, expect, it } from "vitest";
import { retrievedLead } from "../../../test/retrieved-lead";
import { classifyLead } from "@/modules/classifier/classify-lead";
import { parseEvaluation } from "./parse-evaluation";

const lead = retrievedLead({
  body: "We are looking for an agency to rebuild our patient portal. Budget is around $40,000.",
});
const organizations = new Set(["org_northwind"]);

function evaluatorOutput(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    score: 82,
    evidence: ["looking for an agency to rebuild our patient portal"],
    explanation: "Asks for an agency and states a budget.",
    matchedOrganizationId: null,
    ...overrides,
  });
}

describe("parseEvaluation", () => {
  it("accepts well-formed output whose quotes appear in the lead", () => {
    expect(parseEvaluation(evaluatorOutput(), lead, organizations)).toEqual({
      evaluation: {
        score: 82,
        evidence: ["looking for an agency to rebuild our patient portal"],
        explanation: "Asks for an agency and states a budget.",
        matchedOrganizationId: null,
        signals: null,
      },
      error: null,
    });
  });

  it("keeps a score breakdown whose points add up to the score", () => {
    const signals = [
      { points: 40, reason: 'Mentions "patient portal" and "looking for an agency".' },
      { points: 15, reason: "Healthcare is a target industry." },
      { points: 20, reason: "Budget of $40,000 meets the $20,000 minimum." },
    ];
    const parsed = parseEvaluation(evaluatorOutput({ score: 75, signals }), lead, organizations);

    expect(parsed.evaluation).toMatchObject({ score: 75, signals });
    expect(parsed.error).toBeNull();
  });

  it("keeps a breakdown whose total falls below zero when the score is held at zero", () => {
    const signals = [
      { points: 0, reason: "Does not mention any of the keywords." },
      { points: -15, reason: "Budget of $5,000 is below the $20,000 minimum." },
    ];
    const parsed = parseEvaluation(evaluatorOutput({ score: 0, signals }), lead, organizations);

    expect(parsed.evaluation.signals).toEqual(signals);
  });

  it("drops a breakdown that does not add up to the score but keeps the evaluation", () => {
    const signals = [{ points: 40, reason: "Mentions the keywords." }];
    const parsed = parseEvaluation(evaluatorOutput({ score: 82, signals }), lead, organizations);

    expect(parsed.evaluation).toMatchObject({ score: 82, signals: null });
    expect(parsed.error).toBeNull();
  });

  it.each([
    ["points that are not whole numbers", [{ points: 82.5, reason: "Fits." }]],
    ["an empty reason", [{ points: 82, reason: " " }]],
    ["a reason too long to show", [{ points: 82, reason: "x".repeat(301) }]],
    ["a breakdown that is not a list", { points: 82, reason: "Fits." }],
  ])("drops a breakdown with %s but keeps the evaluation", (_case, signals) => {
    const parsed = parseEvaluation(evaluatorOutput({ score: 82, signals }), lead, organizations);

    expect(parsed.evaluation).toMatchObject({ score: 82, signals: null });
    expect(parsed.error).toBeNull();
  });

  it("falls back to a zero score with a reason when the output is not JSON", () => {
    const parsed = parseEvaluation("Sure! Here is my evaluation: strong lead", lead, organizations);

    expect(parsed.evaluation).toMatchObject({ score: 0, evidence: [] });
    expect(parsed.error).toBe("The evaluator returned text that is not JSON.");
  });

  it("falls back when the score is out of range", () => {
    const parsed = parseEvaluation(evaluatorOutput({ score: 140 }), lead, organizations);

    expect(parsed.evaluation.score).toBe(0);
    expect(parsed.error).toMatch(/^The evaluator output failed validation: score/);
  });

  it("falls back when evidence is missing", () => {
    const { evidence: _evidence, ...rest } = JSON.parse(evaluatorOutput()) as Record<string, unknown>;
    const parsed = parseEvaluation(JSON.stringify(rest), lead, organizations);

    expect(parsed.error).toMatch(/^The evaluator output failed validation: evidence/);
  });

  it("removes quotes that do not appear in the lead text", () => {
    const output = evaluatorOutput({
      evidence: ["We are LOOKING for an agency", "We have signed off a $90k budget"],
    });
    const parsed = parseEvaluation(output, lead, organizations);

    expect(parsed.evaluation.evidence).toEqual(["We are LOOKING for an agency"]);
    expect(parsed.evaluation.explanation).toBe(
      "Asks for an agency and states a budget. 1 quoted passage was not found in the lead and was removed.",
    );
    expect(parsed.error).toBeNull();
  });

  it("does not accept a fragment too short to show anything as evidence, so the lead falls to weak", () => {
    const parsed = parseEvaluation(
      evaluatorOutput({ score: 90, evidence: ["a", "portal"] }),
      lead,
      organizations,
    );

    expect(parsed.evaluation.evidence).toEqual([]);
    expect(classifyLead(parsed.evaluation)).toBe("weak");
  });

  it("accepts a short quote of three words", () => {
    const parsed = parseEvaluation(
      evaluatorOutput({ evidence: ["rebuild our patient"] }),
      lead,
      organizations,
    );
    expect(parsed.evaluation.evidence).toEqual(["rebuild our patient"]);
  });

  it("drops an organization id that is not registered", () => {
    const parsed = parseEvaluation(
      evaluatorOutput({ matchedOrganizationId: "org_unknown" }),
      lead,
      organizations,
    );
    expect(parsed.evaluation.matchedOrganizationId).toBeNull();
  });

  it("keeps a registered organization id", () => {
    const parsed = parseEvaluation(
      evaluatorOutput({ matchedOrganizationId: "org_northwind" }),
      lead,
      organizations,
    );
    expect(parsed.evaluation.matchedOrganizationId).toBe("org_northwind");
  });
});
