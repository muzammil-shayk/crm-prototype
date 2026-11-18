import { describe, expect, it } from "vitest";
import type { Lead } from "@/api-client/types";
import { groupLeads, leadPage } from "./group-leads";

function lead(id: string, tier: Lead["tier"], status: Lead["status"] = "new") {
  return { id, tier, status } as Lead;
}

describe("groupLeads", () => {
  const leads = [lead("a", "strong"), lead("b", "weak", "dismissed"), lead("c", "strong", "contacted")];

  it("groups by tier in Strong, Medium, Weak order and skips empty tiers", () => {
    const { groups, tierCounts, total } = groupLeads(leads, { tier: "all", status: "all" });
    expect(groups.map((group) => [group.tier, group.leads.map((item) => item.id)])).toEqual([
      ["strong", ["a", "c"]],
      ["weak", ["b"]],
    ]);
    expect(tierCounts).toEqual({ strong: 2, medium: 0, weak: 1 });
    expect(total).toBe(3);
  });

  it("filters by status before counting and by tier before grouping", () => {
    const { groups, tierCounts } = groupLeads(leads, { tier: "strong", status: "contacted" });
    expect(groups).toEqual([{ tier: "strong", leads: [leads[2]] }]);
    expect(tierCounts).toEqual({ strong: 1, medium: 0, weak: 0 });
  });
});

describe("leadPage", () => {
  const leads = [
    lead("s1", "strong"),
    lead("w1", "weak"),
    lead("m1", "medium", "dismissed"),
    lead("s2", "strong", "contacted"),
    lead("m2", "medium"),
  ];
  const all = { tier: "all", status: "all" } as const;

  it("steps through leads in the order they are listed: tier first, then as returned", () => {
    expect(leadPage(leads, all, "s2")).toEqual({ previous: "s1", next: "m1", position: 2, total: 5 });
    expect(leadPage(leads, all, "s1")).toMatchObject({ previous: null, position: 1 });
    expect(leadPage(leads, all, "w1")).toMatchObject({ next: null, position: 5 });
  });

  it("skips leads hidden by the active filter", () => {
    expect(leadPage(leads, { tier: "all", status: "new" }, "s1")).toEqual({
      previous: null,
      next: "m2",
      position: 1,
      total: 3,
    });
  });

  it("still finds both neighbours when the open lead just left the filter", () => {
    expect(leadPage(leads, { tier: "all", status: "new" }, "m1")).toEqual({
      previous: "s1",
      next: "m2",
      position: 0,
      total: 3,
    });
  });

  it("has no neighbours for a lead that is not in the run", () => {
    expect(leadPage(leads, all, "gone")).toMatchObject({ previous: null, next: null, position: 0 });
  });
});
