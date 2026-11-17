import { describe, expect, it } from "vitest";
import { MockLlmProvider } from "@/modules/providers/mock/mock-llm-provider";
import type { LlmProvider, RetrievedLead } from "@/modules/providers/provider-types";
import { parseSearchConfigInput } from "@/modules/search-types/registry";
import { memoryCache, pipelineContext } from "../../../test/pipeline-context";
import { retrievedLead } from "../../../test/retrieved-lead";
import { CostBudget } from "./cost-budget";
import { evaluate } from "./evaluate";

const config = parseSearchConfigInput({
  type: "buyers-seeking-providers",
  name: "Clinics",
  criteria: { keywords: ["patient portal"], industries: ["healthcare"] },
});

const leads: RetrievedLead[] = [
  retrievedLead({ url: "https://a.example/1", company: "Harbourside Dental Group" }),
  retrievedLead({ url: "https://a.example/2", company: "Northgate Private Clinic" }),
];

function llmWhere(
  answer: (lead: RetrievedLead) => Promise<string>,
  id = "mock-llm",
): LlmProvider & { calls: number } {
  const provider = {
    id,
    calls: 0,
    evaluateLead: (request: { lead: RetrievedLead }) => {
      provider.calls += 1;
      return answer(request.lead);
    },
  };
  return provider;
}

const mock = new MockLlmProvider();
const realAnswer = (lead: RetrievedLead) =>
  mock.evaluateLead({ lead, config, organizations: [] }, new AbortController().signal);

describe("evaluate", () => {
  it("scores every lead and keeps the evaluator's quotes", async () => {
    const outcome = await evaluate(leads, config, [], pipelineContext());

    expect(outcome.failures).toEqual([]);
    expect(outcome.leads[0]).toMatchObject({
      company: "Harbourside Dental Group",
      score: 35,
      evidence: ["We are looking for an agency to rebuild our patient portal."],
      evaluationError: null,
    });
  });

  it("keeps the other leads when the evaluator fails on one", async () => {
    const llm = llmWhere((lead) =>
      lead.url.endsWith("/1") ? Promise.reject(new Error("model overloaded")) : realAnswer(lead),
    );

    const outcome = await evaluate(leads, config, [], pipelineContext({ llm }));

    expect(outcome.leads.map((lead) => lead.evaluationError)).toEqual([
      "The llm provider failed: model overloaded (after 2 attempts)",
      null,
    ]);
    expect(outcome.leads[0]).toMatchObject({ score: 0, evidence: [] });
    expect(outcome.failures).toEqual([
      'Lead "Harbourside Dental Group": The llm provider failed: model overloaded (after 2 attempts)',
    ]);
  });

  it("falls back with a reason when the evaluator returns unusable output", async () => {
    const llm = llmWhere(() => Promise.resolve("I think this lead is strong!"));

    const outcome = await evaluate(leads.slice(0, 1), config, [], pipelineContext({ llm }));

    expect(outcome.leads[0]?.evaluationError).toBe("The evaluator returned text that is not JSON.");
    expect(outcome.failures).toHaveLength(1);
  });

  it("reuses a cached evaluation for the same config and lead", async () => {
    const llm = llmWhere(realAnswer);
    const cache = memoryCache();
    await evaluate(leads, config, [], pipelineContext({ llm, cache }));

    const second = await evaluate(leads, config, [], pipelineContext({ llm, cache }));

    expect(llm.calls).toBe(2);
    expect(second.leads[0]?.score).toBe(35);
  });

  it.each([
    ["the evaluator changes", { llmId: "other-llm" }],
    [
      "a registered organization changes",
      { organizations: [{ id: "org_new", name: "New", services: ["dbt"] }] },
    ],
    ["the lead text changes", { body: "We now need a full rebuild of our patient portal and app." }],
  ])("asks the evaluator again when %s", async (_change, change) => {
    const cache = memoryCache();
    await evaluate(leads.slice(0, 1), config, [], pipelineContext({ llm: llmWhere(realAnswer), cache }));
    const llm = llmWhere(realAnswer, "llmId" in change ? change.llmId : "mock-llm");
    const [original] = leads;
    if (!original) throw new Error("expected a lead");
    const lead = "body" in change ? { ...original, body: change.body } : original;
    const organizations = "organizations" in change ? change.organizations : [];

    await evaluate([lead], config, organizations, pipelineContext({ llm, cache }));

    expect(llm.calls).toBe(1);
  });

  it("does not cache unusable output, so the next run asks again", async () => {
    const llm = llmWhere(() => Promise.resolve("{}"));
    const cache = memoryCache();
    await evaluate(leads.slice(0, 1), config, [], pipelineContext({ llm, cache }));
    await evaluate(leads.slice(0, 1), config, [], pipelineContext({ llm, cache }));

    expect(llm.calls).toBe(2);
    expect([...cache.entries.keys()]).toEqual([]);
  });

  it("marks leads it could not afford to evaluate instead of calling the model", async () => {
    const llm = llmWhere(realAnswer);

    const outcome = await evaluate(leads, config, [], pipelineContext({ llm, budget: new CostBudget(1) }));

    expect(llm.calls).toBe(1);
    expect(outcome.leads[1]).toMatchObject({
      score: 0,
      evidence: [],
      evaluationError: "Not evaluated: the run reached its cost limit.",
    });
    expect(outcome.failures).toEqual([]);
  });
});
