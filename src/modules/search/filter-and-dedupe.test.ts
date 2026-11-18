import { describe, expect, it } from "vitest";
import { retrievedLead } from "../../../test/retrieved-lead";
import { filterAndDedupe } from "./filter-and-dedupe";

const noFilters = { excludedKeywords: [], industries: [], locations: [] };

describe("filterAndDedupe", () => {
  it("keeps the first copy of a lead seen under the same URL", () => {
    const first = retrievedLead({ url: "https://Boards.example.org/posts/1/", title: "First copy" });
    const second = retrievedLead({ url: "https://boards.example.org/posts/1#apply", title: "Second copy" });

    const outcome = filterAndDedupe([first, second], noFilters, 10);

    expect(outcome.leads.map((lead) => lead.title)).toEqual(["First copy"]);
    expect(outcome.duplicates).toBe(1);
  });

  it("treats URL paths as case-sensitive", () => {
    const leads = [
      retrievedLead({ url: "https://a.example/Job/7" }),
      retrievedLead({ url: "https://a.example/job/7" }),
    ];
    expect(filterAndDedupe(leads, noFilters, 10).duplicates).toBe(0);
  });

  it("drops leads that mention an excluded keyword as a whole word", () => {
    const internship = retrievedLead({
      url: "https://a.example/1",
      body: "Paid internship for a junior developer.",
    });
    const international = retrievedLead({
      url: "https://a.example/2",
      body: "An international retailer needs help.",
    });

    const outcome = filterAndDedupe(
      [internship, international],
      { ...noFilters, excludedKeywords: ["Internship"] },
      10,
    );

    expect(outcome.leads.map((lead) => lead.url)).toEqual(["https://a.example/2"]);
    expect(outcome.excluded).toBe(1);
  });

  it("caps the lead count after filtering and reports the cut", () => {
    const leads = [1, 2, 3].map((n) => retrievedLead({ url: `https://a.example/${n}` }));

    const outcome = filterAndDedupe(leads, noFilters, 2);

    expect(outcome.leads).toHaveLength(2);
    expect(outcome.truncated).toBe(true);
  });

  it("does not report a cut when the leads fit", () => {
    expect(filterAndDedupe([retrievedLead()], noFilters, 1).truncated).toBe(false);
  });

  it("drops leads outside the target locations or industries and counts them apart", () => {
    const leads = [
      retrievedLead({
        url: "https://a.example/1",
        company: "Kept",
        location: "Dubai",
        industry: "real-estate",
      }),
      retrievedLead({
        url: "https://a.example/2",
        company: "Wrong place",
        location: "Leeds, United Kingdom",
      }),
      retrievedLead({
        url: "https://a.example/3",
        company: "Wrong trade",
        location: "Sharjah",
        industry: "saas",
      }),
      retrievedLead({ url: "https://a.example/4", company: "Remote", location: "Remote" }),
    ];

    const outcome = filterAndDedupe(
      leads,
      { excludedKeywords: [], industries: ["real-estate", "healthcare"], locations: ["UAE"] },
      10,
    );

    expect(outcome.leads.map((lead) => lead.company)).toEqual(["Kept"]);
    expect(outcome.outsideFilters).toBe(3);
    expect(outcome.excluded).toBe(0);
  });

  it("splits the filter drops into location and industry, counting a lead failing both under location", () => {
    const leads = [
      retrievedLead({
        url: "https://a.example/1",
        location: "Leeds, United Kingdom",
        industry: "healthcare",
      }),
      retrievedLead({ url: "https://a.example/2", location: "Sharjah", industry: "saas" }),
      retrievedLead({ url: "https://a.example/3", location: "Leeds, United Kingdom", industry: "saas" }),
      retrievedLead({ url: "https://a.example/4", location: "Dubai", industry: "healthcare" }),
    ];

    const outcome = filterAndDedupe(
      leads,
      { excludedKeywords: [], industries: ["healthcare"], locations: ["UAE"] },
      10,
    );

    expect(outcome.leads.map((lead) => lead.url)).toEqual(["https://a.example/4"]);
    expect([outcome.outsideLocation, outcome.outsideIndustry, outcome.outsideFilters]).toEqual([2, 1, 3]);
  });

  it("counts a lead that is both excluded and outside the filters once, as excluded", () => {
    const lead = retrievedLead({ body: "Unpaid trial first.", location: "Berlin, Germany" });

    const outcome = filterAndDedupe(
      [lead],
      { excludedKeywords: ["unpaid"], industries: [], locations: ["UK"] },
      10,
    );

    expect([outcome.excluded, outcome.outsideFilters]).toEqual([1, 0]);
  });

  it("drops and counts a lead whose location is too long to trust", () => {
    const oversized = retrievedLead({ location: `Lahore, Pakistan ${"x".repeat(50_000)}` });

    const outcome = filterAndDedupe([oversized], { ...noFilters, locations: ["Pakistan"] }, 10);

    expect([outcome.leads.length, outcome.outsideFilters]).toEqual([0, 1]);
  });

  it("applies the lead cap after the location filter", () => {
    const leads = [
      retrievedLead({ url: "https://a.example/1", location: "Berlin, Germany" }),
      retrievedLead({ url: "https://a.example/2", location: "London, United Kingdom" }),
    ];

    const outcome = filterAndDedupe(leads, { ...noFilters, locations: ["UK"] }, 1);

    expect(outcome.leads.map((lead) => lead.location)).toEqual(["London, United Kingdom"]);
    expect(outcome.truncated).toBe(false);
  });
});
