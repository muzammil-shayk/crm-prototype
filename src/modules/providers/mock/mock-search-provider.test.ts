import { describe, expect, it } from "vitest";
import { fixturePostings } from "../../../../test/mock-postings";
import { retrievedLead } from "../../../../test/retrieved-lead";
import { MockSearchProvider } from "./mock-search-provider";

const signal = new AbortController().signal;
const provider = new MockSearchProvider(0, fixturePostings);

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

  it("searches only the postings it was given", async () => {
    const pool = [
      {
        ...retrievedLead({ url: "https://boards.example.org/posts/7", company: "Tamarind Clinics" }),
        kind: "buyer" as const,
      },
    ];

    const leads = await new MockSearchProvider(0, pool).search(
      { text: "patient portal", leadKind: "buyer" },
      signal,
    );

    expect(leads.map((lead) => lead.company)).toEqual(["Tamarind Clinics"]);
  });

  it("returns nothing for a query no posting mentions", async () => {
    expect(await provider.search({ text: "blockchain casino", leadKind: "buyer" }, signal)).toEqual([]);
  });
});
