import { describe, expect, it } from "vitest";
import type { Lead } from "@/api-client/types";
import { groupLeads } from "./group-leads";

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
