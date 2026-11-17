import { describe, expect, it } from "vitest";
import { retrievedLead } from "../../../test/retrieved-lead";
import { filterAndDedupe } from "./filter-and-dedupe";

describe("filterAndDedupe", () => {
  it("keeps the first copy of a lead seen under the same URL", () => {
    const first = retrievedLead({ url: "https://Boards.example.org/posts/1/", title: "First copy" });
    const second = retrievedLead({ url: "https://boards.example.org/posts/1#apply", title: "Second copy" });

    const outcome = filterAndDedupe([first, second], [], 10);

    expect(outcome.leads.map((lead) => lead.title)).toEqual(["First copy"]);
    expect(outcome.duplicates).toBe(1);
  });

  it("treats URL paths as case-sensitive", () => {
    const leads = [
      retrievedLead({ url: "https://a.example/Job/7" }),
      retrievedLead({ url: "https://a.example/job/7" }),
    ];
    expect(filterAndDedupe(leads, [], 10).duplicates).toBe(0);
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

    const outcome = filterAndDedupe([internship, international], ["Internship"], 10);

    expect(outcome.leads.map((lead) => lead.url)).toEqual(["https://a.example/2"]);
    expect(outcome.excluded).toBe(1);
  });

  it("caps the lead count after filtering and reports the cut", () => {
    const leads = [1, 2, 3].map((n) => retrievedLead({ url: `https://a.example/${n}` }));

    const outcome = filterAndDedupe(leads, [], 2);

    expect(outcome.leads).toHaveLength(2);
    expect(outcome.truncated).toBe(true);
  });

  it("does not report a cut when the leads fit", () => {
    expect(filterAndDedupe([retrievedLead()], [], 1).truncated).toBe(false);
  });
});
