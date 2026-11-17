import type { Lead as LeadRow, Prisma } from "@prisma/client";
import { db, nullIfMissing } from "@/lib/db";
import { parseStringList } from "@/lib/json";
import { TIERS, type Tier } from "@/modules/classifier/classify-lead";
import type { ClassifiedLead } from "@/modules/search/pipeline-types";
import { asLeadStatus, type LeadStatus } from "./lead-status";

export interface Lead {
  id: string;
  runId: string;
  url: string;
  title: string;
  source: string;
  company: string;
  location: string;
  industry: string;
  publishedAt: Date;
  body: string;
  budgetUsd: number | null;
  engagementType: string | null;
  score: number;
  tier: Tier;
  explanation: string;
  evidence: string[];
  evaluationError: string | null;
  matchedOrganization: { id: string; name: string } | null;
  status: LeadStatus;
  createdAt: Date;
}

interface LeadFilter {
  runId?: string;
  status?: LeadStatus;
  tier?: Tier;
  limit?: number;
}

const withOrganization = { matchedOrganization: { select: { id: true, name: true } } } as const;
type LeadRowWithOrganization = LeadRow & { matchedOrganization: { id: string; name: string } | null };

function toLead({ matchedOrganizationId: _id, ...row }: LeadRowWithOrganization): Lead {
  return {
    ...row,
    tier: TIERS.find((tier) => tier === row.tier) ?? "weak",
    evidence: parseStringList(row.evidence),
    status: asLeadStatus(row.status),
  };
}

export function leadRowsFor(runId: string, leads: readonly ClassifiedLead[]): Prisma.LeadCreateManyInput[] {
  return leads.map((lead) => ({
    runId,
    url: lead.url,
    title: lead.title,
    source: lead.source,
    company: lead.company,
    location: lead.location,
    industry: lead.industry,
    publishedAt: new Date(lead.publishedAt),
    body: lead.body,
    budgetUsd: lead.budgetUsd ?? null,
    engagementType: lead.engagementType ?? null,
    score: lead.score,
    tier: lead.tier,
    explanation: lead.explanation,
    evidence: JSON.stringify(lead.evidence),
    evaluationError: lead.evaluationError,
    matchedOrganizationId: lead.matchedOrganizationId,
  }));
}

export const leadRepository = {
  async findMany({ limit = Infinity, tier, ...where }: LeadFilter): Promise<Lead[]> {
    const leads: Lead[] = [];
    for (const wanted of tier ? [tier] : TIERS) {
      const remaining = limit - leads.length;
      if (remaining <= 0) break;
      const rows = await db.lead.findMany({
        where: { ...where, tier: wanted },
        include: withOrganization,
        orderBy: [{ score: "desc" }, { company: "asc" }, { id: "asc" }],
        take: Number.isFinite(remaining) ? remaining : undefined,
      });
      leads.push(...rows.map(toLead));
    }
    return leads;
  },

  async updateStatus(id: string, status: LeadStatus): Promise<Lead | null> {
    const row = await nullIfMissing(
      db.lead.update({ where: { id }, data: { status }, include: withOrganization }),
    );
    return row ? toLead(row) : null;
  },
};
