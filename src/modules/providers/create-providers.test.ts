import { describe, expect, it } from "vitest";
import { createProviders } from "./create-providers";
import { MockLlmProvider } from "./mock/mock-llm-provider";
import { MockSearchProvider } from "./mock/mock-search-provider";

describe("createProviders", () => {
  it("uses the mock providers when nothing is configured", () => {
    const providers = createProviders({});
    expect(providers.search).toBeInstanceOf(MockSearchProvider);
    expect(providers.llm).toBeInstanceOf(MockLlmProvider);
  });

  it("refuses a provider this build does not include", () => {
    expect(() => createProviders({ SEARCH_PROVIDER: "serpapi" })).toThrow(
      'SEARCH_PROVIDER "serpapi" is not available. Supported: mock.',
    );
    expect(() => createProviders({ LLM_PROVIDER: "openai" })).toThrow(
      'LLM_PROVIDER "openai" is not available. Supported: mock.',
    );
  });
});
