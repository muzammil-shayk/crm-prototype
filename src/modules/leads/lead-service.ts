import { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { recordIdSchema } from "@/lib/record-id";
import { TIERS } from "@/modules/classifier/classify-lead";
import { leadRepository, type Lead } from "./lead-repository";
import { leadStatusSchema } from "./lead-status";

const leadFilterSchema = z.strictObject({
  runId: recordIdSchema.optional(),
  status: leadStatusSchema.optional(),
  tier: z.enum(TIERS, { error: () => `Tier must be one of: ${TIERS.join(", ")}` }).optional(),
  limit: z.coerce
    .number({ error: "Limit must be a whole number" })
    .int("Limit must be a whole number")
    .min(1, "Limit must be at least 1")
    .max(500, "Limit must be 500 or less")
    .default(100),
});

const statusChangeSchema = z.strictObject({ status: leadStatusSchema });

export async function listLeads(query: unknown): Promise<Lead[]> {
  return leadRepository.findMany(leadFilterSchema.parse(query));
}

export async function setLeadStatus(id: string, body: unknown): Promise<Lead> {
  const { status } = statusChangeSchema.parse(body);
  const lead = await leadRepository.updateStatus(id, status);
  if (!lead) throw new NotFoundError("Lead", id);
  return lead;
}
