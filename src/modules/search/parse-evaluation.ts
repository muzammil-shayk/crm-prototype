import { z } from "zod";
import { parseJsonOrUndefined } from "@/lib/json";
import type { RetrievedLead } from "@/modules/providers/provider-types";
import type { Evaluation } from "./pipeline-types";

const evaluatorOutputSchema = z.object({
  score: z.number().int().min(0).max(100),
  evidence: z.array(z.string()),
  explanation: z.string().trim().min(1),
  matchedOrganizationId: z.string().nullable(),
});

const fallbackExplanation = "The evaluator output could not be used, so this lead is marked Weak.";

export function fallbackEvaluation(explanation: string = fallbackExplanation): Evaluation {
  return { score: 0, evidence: [], explanation, matchedOrganizationId: null };
}

function fallback(error: string) {
  return { evaluation: fallbackEvaluation(), error };
}

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

const MIN_QUOTE_WORDS = 3;
const MIN_QUOTE_CHARACTERS = 15;

function isSubstantial(quote: string): boolean {
  const text = normalize(quote);
  return text.split(" ").length >= MIN_QUOTE_WORDS || text.length >= MIN_QUOTE_CHARACTERS;
}

function removalNote(removed: number): string {
  if (removed === 0) return "";
  if (removed === 1) return " 1 quoted passage was not found in the lead and was removed.";
  return ` ${removed} quoted passages were not found in the lead and were removed.`;
}

export function parseEvaluation(
  raw: string,
  lead: RetrievedLead,
  organizationIds: ReadonlySet<string>,
): { evaluation: Evaluation; error: string | null } {
  const json = parseJsonOrUndefined(raw);
  if (json === undefined) return fallback("The evaluator returned text that is not JSON.");

  const parsed = evaluatorOutputSchema.safeParse(json);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    return fallback(`The evaluator output failed validation: ${problems.join("; ")}`);
  }

  const source = normalize(`${lead.title} ${lead.body}`);
  const quotes = parsed.data.evidence.filter(isSubstantial);
  const evidence = quotes.filter((quote) => source.includes(normalize(quote)));
  const removed = quotes.length - evidence.length;
  const { matchedOrganizationId } = parsed.data;

  return {
    evaluation: {
      score: parsed.data.score,
      evidence,
      explanation: parsed.data.explanation + removalNote(removed),
      matchedOrganizationId:
        matchedOrganizationId !== null && organizationIds.has(matchedOrganizationId)
          ? matchedOrganizationId
          : null,
    },
    error: null,
  };
}
