import { describe, expect, it } from "vitest";
import { parseSearchConfigInput } from "@/modules/search-types/registry";
import type { OrganizationProfile, RetrievedLead } from "../provider-types";
import { MockLlmProvider } from "./mock-llm-provider";
import { mockPostings } from "./mock-postings";

const signal = new AbortController().signal;
const llm = new MockLlmProvider();

const buyersConfig = parseSearchConfigInput({
  type: "buyers-seeking-providers",
  name: "Clinics and lenders hiring an app agency",
  criteria: {
    keywords: ["patient portal", "looking for an agency"],
    industries: ["healthcare"],
    locations: ["United Kingdom"],
    minBudgetUsd: 20000,
  },
});

const jobsConfig = parseSearchConfigInput({
  type: "jobs-for-our-organizations",
  name: "Data contracts",
  criteria: {
    keywords: ["data pipeline"],
    servicesToMatch: ["dbt", "data engineering"],
    locations: ["Remote"],
  },
});

const organizations: OrganizationProfile[] = [
  { id: "org_kestrel", name: "Kestrel Mobile", services: ["React Native", "iOS"] },
  { id: "org_northwind", name: "Northwind Data Studio", services: ["data engineering", "dbt", "Snowflake"] },
];

function posting(company: string): RetrievedLead {
  const found = mockPostings.find((candidate) => candidate.company === company);
  if (!found) throw new Error(`No mock posting for ${company}`);
  return found;
}

async function evaluate(company: string, config = buyersConfig) {
  const raw = await llm.evaluateLead({ lead: posting(company), config, organizations }, signal);
  return JSON.parse(raw) as {
    score: number;
    evidence: string[];
    explanation: string;
    matchedOrganizationId: string | null;
  };
}

describe("MockLlmProvider", () => {
  it("scores a lead that matches every criterion highly and quotes the sentences that show it", async () => {
    const evaluation = await evaluate("Harbourside Dental Group");

    expect(evaluation.score).toBe(90);
    expect(evaluation.evidence).toEqual([
      "We run 14 dental clinics across the South West and our patient portal is a 2014 PHP build that patients avoid.",
      "We are looking for an agency to rebuild booking, reminders and card payments.",
    ]);
    expect(evaluation.explanation).toContain("Budget of $45,000 meets the $20,000 minimum.");
  });

  it("returns no evidence when only the title mentions the keywords", async () => {
    const evaluation = await evaluate("Northgate Private Clinic");

    expect(evaluation.evidence).toEqual([]);
    expect(evaluation.score).toBeGreaterThanOrEqual(40);
  });

  it("marks a stated budget below the minimum down", async () => {
    const evaluation = await evaluate("Meridian Physio");

    expect(evaluation.explanation).toContain("Budget of $6,000 is below the $20,000 minimum.");
    expect(evaluation.score).toBeLessThan(40);
  });

  it("matches a job to the registered organization whose services it mentions most", async () => {
    const evaluation = await evaluate("Fenwick Retail Group", jobsConfig);

    expect(evaluation.matchedOrganizationId).toBe("org_northwind");
    expect(evaluation.explanation).toContain("Northwind Data Studio covers dbt and data engineering.");
  });

  it("gives the same answer every time", async () => {
    expect(await evaluate("Pinewood Credit Union")).toEqual(await evaluate("Pinewood Credit Union"));
  });
});
