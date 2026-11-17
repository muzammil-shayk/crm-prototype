import { MockLlmProvider } from "./mock/mock-llm-provider";
import { MockSearchProvider } from "./mock/mock-search-provider";
import type { LlmProvider, SearchProvider } from "./provider-types";

const searchProviders: Record<string, () => SearchProvider> = { mock: () => new MockSearchProvider() };
const llmProviders: Record<string, () => LlmProvider> = { mock: () => new MockLlmProvider() };

function pick<T>(variable: string, choice: string | undefined, available: Record<string, () => T>): T {
  const name = choice ?? "mock";
  const build = available[name];
  if (!build) {
    throw new Error(
      `${variable} "${name}" is not available. Supported: ${Object.keys(available).join(", ")}.`,
    );
  }
  return build();
}

export function createProviders(env: Record<string, string | undefined>) {
  return {
    search: pick("SEARCH_PROVIDER", env.SEARCH_PROVIDER, searchProviders),
    llm: pick("LLM_PROVIDER", env.LLM_PROVIDER, llmProviders),
  };
}
