import type { LeadKind } from "@/modules/search-types/search-type";
import type { RetrievedLead } from "../provider-types";
import { healthBuyerPostings } from "./postings/buyers-health";
import { appBuyerPostings } from "./postings/buyers-apps";
import { marketingBuyerPostings } from "./postings/buyers-marketing";
import { securityBuyerPostings } from "./postings/buyers-security";
import { dataJobPostings } from "./postings/jobs-data";
import { cloudJobPostings } from "./postings/jobs-cloud";
import { mobileJobPostings } from "./postings/jobs-mobile";
import { integrationJobPostings } from "./postings/jobs-integrations";
import { serviceJobPostings } from "./postings/jobs-services";

export interface MockPosting extends RetrievedLead {
  kind: LeadKind;
}

export const mockPostings: readonly MockPosting[] = [
  ...healthBuyerPostings,
  ...appBuyerPostings,
  ...marketingBuyerPostings,
  ...securityBuyerPostings,
  ...dataJobPostings,
  ...cloudJobPostings,
  ...mobileJobPostings,
  ...integrationJobPostings,
  ...serviceJobPostings,
];
