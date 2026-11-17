import { z } from "zod";
import type { RetrievedLead } from "./provider-types";

export const retrievedLeadsSchema: z.ZodType<RetrievedLead[]> = z.array(
  z.object({
    url: z.url(),
    title: z.string().min(1),
    source: z.string(),
    company: z.string(),
    location: z.string(),
    industry: z.string(),
    publishedAt: z.iso.datetime(),
    body: z.string(),
    budgetUsd: z.number().nonnegative().optional(),
    engagementType: z.string().optional(),
  }),
);
