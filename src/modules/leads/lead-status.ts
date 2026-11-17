import { z } from "zod";

export const LEAD_STATUSES = ["new", "contacted", "dismissed"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const leadStatusSchema = z.enum(LEAD_STATUSES, {
  error: () => `Status must be one of: ${LEAD_STATUSES.join(", ")}`,
});

export function asLeadStatus(value: string): LeadStatus {
  return LEAD_STATUSES.find((status) => status === value) ?? "new";
}
