// @vitest-environment happy-dom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Lead } from "@/api-client/types";
import { stubFetch } from "../../../test/ui/fake-api";
import { LeadDetail } from "./LeadDetail";

const lead: Lead = {
  id: "lead-7",
  runId: "run-1",
  url: "https://forum.example.org/t/portal-rebuild",
  title: "Dental group needs a new patient portal",
  source: "Practice Owners Forum",
  company: "Brightside Dental Partners",
  location: "Leeds",
  industry: "healthcare",
  publishedAt: "2026-11-12T08:30:00.000Z",
  body: "Our booking system is ten years old. We have budget approved for a patient portal rebuild this quarter.",
  budgetUsd: 42000,
  engagementType: null,
  score: 78,
  tier: "strong",
  explanation: "Names the work, states a budget and a start date.",
  evidence: ["budget approved for a patient portal rebuild"],
  evaluationError: null,
  matchedOrganization: null,
  status: "new",
  createdAt: "2026-11-18T10:00:04.000Z",
};

function open(onLeadChange = vi.fn()) {
  render(
    <LeadDetail
      lead={lead}
      configType="buyers-seeking-providers"
      types={[]}
      onClose={() => undefined}
      onLeadChange={onLeadChange}
    />,
  );
  return onLeadChange;
}

const choose = (label: string) =>
  act(async () => {
    screen.getByRole("radio", { name: label }).click();
    await Promise.resolve();
  });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("LeadDetail", () => {
  it("shows the score, tier, and each quote highlighted in the post", () => {
    stubFetch(() => ({ body: {} }));
    open();
    expect(screen.getByRole("heading", { name: lead.title })).toBeTruthy();
    expect(screen.getByText("Strong")).toBeTruthy();
    const quote = screen.getByText(lead.evidence[0] ?? "", { selector: "blockquote" });
    expect(quote).toBeTruthy();
    expect(document.querySelector("mark")?.textContent).toBe(lead.evidence[0]);
    expect(screen.getByRole("link", { name: /Open the original post/ }).getAttribute("href")).toBe(lead.url);
  });

  it("applies a status change at once and keeps the server's copy", async () => {
    const api = stubFetch(() => ({ body: { lead: { ...lead, status: "contacted" } } }));
    const onLeadChange = open();
    await choose("Contacted");

    expect(api.calls).toEqual([{ method: "PATCH", path: "/api/leads/lead-7" }]);
    expect(onLeadChange.mock.calls.map(([changed]) => (changed as Lead).status)).toEqual([
      "contacted",
      "contacted",
    ]);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("rolls the status back and explains why when saving fails", async () => {
    stubFetch(() => ({ status: 500, body: { error: { code: "internal_error", message: "Down" } } }));
    const onLeadChange = open();
    await choose("Dismissed");

    expect(onLeadChange.mock.calls.map(([changed]) => (changed as Lead).status)).toEqual([
      "dismissed",
      "new",
    ]);
    expect(screen.getByRole("alert").textContent).toContain("The status was not changed.");
  });

  it("explains a lead with nothing quotable", () => {
    stubFetch(() => ({ body: {} }));
    render(
      <LeadDetail
        lead={{ ...lead, evidence: [], tier: "weak", score: 35 }}
        configType="buyers-seeking-providers"
        types={[]}
        onClose={() => undefined}
        onLeadChange={() => undefined}
      />,
    );
    expect(screen.getByText(/Nothing in the post could be quoted/)).toBeTruthy();
    expect(document.querySelector("mark")).toBeNull();
  });
});
