import { MockSearchProvider } from "@/modules/providers/mock/mock-search-provider";
import { buyerPostings } from "./fixtures/buyer-postings";
import { jobPostings } from "./fixtures/job-postings";

export const fixturePostings = [...buyerPostings, ...jobPostings];

export const fixtureSearch = () => new MockSearchProvider(0, fixturePostings);
