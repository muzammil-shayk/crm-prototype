import { describe, expect, it } from "vitest";
import { parseSearchConfigInput } from "@/modules/search-types/registry";
import { retrievedLead } from "../../../../test/retrieved-lead";
import { createProviders } from "../create-providers";

const config = parseSearchConfigInput({
  type: "buyers-seeking-providers",
  name: "Clinics",
  criteria: { keywords: ["patient portal"] },
});

const calls = {
  search: (env: Record<string, string>, signal: AbortSignal) =>
    createProviders(env).search.search({ text: "patient portal", leadKind: "buyer" }, signal),
  llm: (env: Record<string, string>, signal: AbortSignal) =>
    createProviders(env).llm.evaluateLead({ lead: retrievedLead(), config, organizations: [] }, signal),
};

async function elapsedMs(call: () => Promise<unknown>): Promise<number> {
  const started = performance.now();
  await call();
  return performance.now() - started;
}

describe.each(Object.entries(calls))("mock %s provider latency", (_name, call) => {
  it("answers at once when MOCK_DELAY_MS is not set", async () => {
    expect(await elapsedMs(() => call({}, new AbortController().signal))).toBeLessThan(40);
  });

  it("waits MOCK_DELAY_MS before answering", async () => {
    const waited = await elapsedMs(() => call({ MOCK_DELAY_MS: "80" }, new AbortController().signal));
    expect(waited).toBeGreaterThanOrEqual(75);
  });

  it("stops waiting as soon as the run is cancelled", async () => {
    const run = new AbortController();
    setTimeout(() => {
      run.abort();
    }, 20);
    const started = performance.now();

    await expect(call({ MOCK_DELAY_MS: "5000" }, run.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
