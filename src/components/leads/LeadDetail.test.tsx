// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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

function open(onLeadChange = vi.fn(), shown: Lead = lead) {
  render(
    <LeadDetail
      lead={shown}
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

  it("breaks the score into its signals, losses marked with a minus, adding up to the score", () => {
    stubFetch(() => ({ body: {} }));
    open(vi.fn(), {
      ...lead,
      score: 43,
      signals: [
        { points: 40, reason: 'Mentions "patient portal" and "booking".' },
        { points: 0, reason: "Leeds is outside the target locations." },
        { points: 18, reason: "Healthcare is a target industry." },
        { points: -15, reason: "Budget of $42,000 is below the $50,000 minimum." },
      ],
    });
    const rows = screen.getAllByRole("listitem").filter((item) => item.dataset.sign);
    expect(rows.map((row) => row.dataset.sign)).toEqual(["positive", "zero", "positive", "negative"]);
    expect(rows[3]?.textContent).toBe("−15minus 15 points:Budget of $42,000 is below the $50,000 minimum.");
    expect(screen.getByText("= 43").nextElementSibling?.textContent).toBe("Score");
    expect(screen.getByText(lead.explanation)).toBeTruthy();
  });

  it("says when the signals ran past the 0 to 100 range", () => {
    stubFetch(() => ({ body: {} }));
    open(vi.fn(), {
      ...lead,
      score: 100,
      explanation: "Mentions all four keywords. Healthcare is a target industry. Budget meets the minimum.",
      signals: [
        { points: 50, reason: "Mentions all four keywords." },
        { points: 30, reason: "Healthcare is a target industry." },
        { points: 35, reason: "Budget meets the minimum." },
      ],
    });
    expect(screen.getByText(/held to the 0 to 100 range/).textContent).toBe(
      "Score, held to the 0 to 100 range (the signals add up to +115)",
    );
    expect(screen.getAllByText("Mentions all four keywords.")).toHaveLength(1);
  });

  it("keeps the written reason alone for leads scored before signals were stored", () => {
    stubFetch(() => ({ body: {} }));
    open();
    expect(screen.getByText(lead.explanation)).toBeTruthy();
    expect(document.querySelector("[data-sign]")).toBeNull();
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

  it("steps to the previous and next lead with the buttons and with K and J", () => {
    stubFetch(() => ({ body: {} }));
    const onGo = vi.fn();
    render(
      <LeadDetail
        lead={lead}
        configType="buyers-seeking-providers"
        types={[]}
        page={{ previous: "lead-6", next: "lead-8", position: 2, total: 9 }}
        onGo={onGo}
        onClose={() => undefined}
        onLeadChange={() => undefined}
      />,
    );
    expect(screen.getByText("2 of 9")).toBeTruthy();

    screen.getByRole("button", { name: /Next/ }).click();
    screen.getByRole("button", { name: /Previous/ }).click();
    fireEvent.keyDown(document.body, { key: "j" });
    fireEvent.keyDown(document.body, { key: "k" });
    fireEvent.keyDown(document.body, { key: "j", metaKey: true });

    expect(onGo.mock.calls.map(([id]) => id as string)).toEqual(["lead-8", "lead-6", "lead-8", "lead-6"]);
  });

  it("stays put at the end of the list and ignores J while typing", () => {
    stubFetch(() => ({ body: {} }));
    const onGo = vi.fn();
    render(
      <>
        <input aria-label="Notes" />
        <LeadDetail
          lead={lead}
          configType="buyers-seeking-providers"
          types={[]}
          page={{ previous: "lead-6", next: null, position: 9, total: 9 }}
          onGo={onGo}
          onClose={() => undefined}
          onLeadChange={() => undefined}
        />
      </>,
    );
    const next = screen.getByRole("button", { name: /Next/ });
    expect(next.getAttribute("aria-disabled")).toBe("true");
    next.click();
    fireEvent.keyDown(document.body, { key: "j" });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Notes", hidden: true }), { key: "k" });

    expect(onGo).not.toHaveBeenCalled();
  });
});
