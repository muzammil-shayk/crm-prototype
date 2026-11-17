import type { RetrievedLead } from "@/modules/providers/provider-types";

export function retrievedLead(overrides: Partial<RetrievedLead> = {}): RetrievedLead {
  return {
    url: "https://boards.example.org/posts/1",
    title: "Clinic group seeks agency to rebuild patient portal",
    source: "Upwork",
    company: "Harbourside Dental Group",
    location: "Bristol, United Kingdom",
    industry: "healthcare",
    publishedAt: "2026-11-02T09:00:00.000Z",
    body: "We are looking for an agency to rebuild our patient portal. Budget is around $40,000.",
    ...overrides,
  };
}
