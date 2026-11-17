import { mentions, sentencesOf } from "@/lib/text";
import { queryTermsOf } from "@/modules/search-types/registry";
import type { EvaluationRequest, LlmProvider } from "../provider-types";
import {
  budgetSignal,
  engagementSignal,
  industrySignal,
  locationSignal,
  organizationSignal,
  termSignal,
  type Signal,
} from "./mock-signals";

function scoreLead({ lead, config, organizations }: EvaluationRequest) {
  const { criteria } = config;
  const terms = queryTermsOf(config);
  let typeSignals: (Signal | null)[] = [];
  let matchedOrganizationId: string | null = null;

  switch (config.type) {
    case "buyers-seeking-providers":
      typeSignals = [budgetSignal(lead, config.criteria.minBudgetUsd)];
      break;
    case "jobs-for-our-organizations": {
      const { servicesToMatch, engagementTypes } = config.criteria;
      const organization = organizationSignal(lead, servicesToMatch, organizations);
      typeSignals = [engagementSignal(lead, engagementTypes), organization];
      matchedOrganizationId = organization.organizationId;
      break;
    }
  }

  const signals = [
    termSignal(lead, terms),
    industrySignal(lead, criteria.industries),
    locationSignal(lead, criteria.locations),
    ...typeSignals,
  ].filter((signal): signal is Signal => signal !== null);
  const total = signals.reduce((sum, signal) => sum + signal.points, 0);

  return {
    score: Math.max(0, Math.min(100, total)),
    evidence: sentencesOf(lead.body).filter((sentence) => terms.some((term) => mentions(sentence, term))),
    explanation: signals.map((signal) => signal.reason).join(" "),
    matchedOrganizationId,
  };
}

export class MockLlmProvider implements LlmProvider {
  readonly id = "mock-llm";

  evaluateLead(request: EvaluationRequest, _signal: AbortSignal): Promise<string> {
    return Promise.resolve(JSON.stringify(scoreLead(request)));
  }
}
