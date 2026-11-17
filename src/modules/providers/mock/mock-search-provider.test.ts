import { describe, expect, it } from "vitest";
import { MockSearchProvider } from "./mock-search-provider";

const signal = new AbortController().signal;
const provider = new MockSearchProvider();

describe("MockSearchProvider", () => {
  it("returns postings of the requested kind that mention every word of the query, newest first", async () => {
    const leads = await provider.search({ text: "patient portal", leadKind: "buyer" }, signal);

    expect(leads.map((lead) => lead.company)).toEqual([
      "Northgate Private Clinic",
      "Harbourside Dental Group",
      "Sunrise Pediatrics",
    ]);
  });

  it("never returns postings of the other kind", async () => {
    const leads = await provider.search({ text: "React Native", leadKind: "job" }, signal);
    expect(leads.map((lead) => lead.company)).toEqual(["Brightpath Insurance"]);
  });

  it("returns plain leads without the internal kind marker", async () => {
    const [lead] = await provider.search({ text: "dbt", leadKind: "job" }, signal);
    expect(lead).toBeDefined();
    expect(lead && "kind" in lead).toBe(false);
  });

  it("returns nothing for a query no posting mentions", async () => {
    expect(await provider.search({ text: "blockchain casino", leadKind: "buyer" }, signal)).toEqual([]);
  });
});
