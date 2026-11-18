// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Lead } from "@/api-client/types";
import { LeadRow, noQuoteVerdict } from "./LeadRow";

afterEach(cleanup);

const lead = (patch: Partial<Lead>): Lead => ({
  id: "lead-3",
  runId: "run-1",
  url: "https://forum.example.org/t/3",
  title: "Dental group comparing booking vendors",
  source: "Practice Owners Forum",
  company: "Brightside Dental Partners",
  location: "Leeds",
  industry: "healthcare",
  publishedAt: "2026-11-12T08:30:00.000Z",
  body: "Looking around at what other practices use.",
  budgetUsd: null,
  engagementType: null,
  score: 45,
  tier: "weak",
  explanation: "Mentions booking but names no need.",
  evidence: [],
  evaluationError: null,
  matchedOrganization: null,
  status: "new",
  createdAt: "2026-11-18T10:00:04.000Z",
  ...patch,
});

const row = (value: Lead) => {
  render(
    <ul>
      <LeadRow lead={value} onOpen={() => undefined} />
    </ul>,
  );
  return screen.getByRole("button");
};

describe("No quote marker", () => {
  it("explains why a Medium-sized score stayed Weak", () => {
    const button = row(lead({}));
    expect(button.textContent).toContain("No quote");
    expect(button.textContent).toContain("Scored 45 but kept Weak: no quote from the post backs the match.");
    expect(button.querySelector("[data-no-quote]")?.textContent).toContain("45");
    expect(noQuoteVerdict(lead({}))).toBe(
      "Scored 45, enough for Medium, but nothing in the post could be quoted in support, so it stays Weak.",
    );
  });

  it("marks a low score without a quote but does not strike it", () => {
    const button = row(lead({ score: 22 }));
    expect(button.textContent).toContain("No quote from the post backs the match.");
    expect(button.querySelector("[data-no-quote]")).toBeNull();
    expect(noQuoteVerdict(lead({ score: 22 }))).toBeNull();
  });

  it("leaves quoted leads alone", () => {
    const button = row(lead({ tier: "medium", evidence: ["what other practices use"] }));
    expect(button.textContent).not.toContain("No quote");
  });
});
