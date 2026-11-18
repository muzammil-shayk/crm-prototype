import { MockLlmProvider } from "./mock/mock-llm-provider";
import { MockSearchProvider } from "./mock/mock-search-provider";
import type { LlmProvider, SearchProvider } from "./provider-types";

interface ProviderOptions {
  mockDelayMs: number;
}

const MAX_MOCK_DELAY_MS = 5000;

const searchProviders: Record<string, (options: ProviderOptions) => SearchProvider> = {
  mock: ({ mockDelayMs }) => new MockSearchProvider(mockDelayMs),
};
const llmProviders: Record<string, (options: ProviderOptions) => LlmProvider> = {
  mock: ({ mockDelayMs }) => new MockLlmProvider(mockDelayMs),
};

function readMockDelayMs(value: string | undefined): number {
  if (value === undefined || value === "") return 0;
  const delayMs = Number(value);
  if (!/^\d+$/.test(value) || delayMs > MAX_MOCK_DELAY_MS) {
    throw new Error(
      `MOCK_DELAY_MS must be a whole number of milliseconds from 0 to ${MAX_MOCK_DELAY_MS} (got "${value}").`,
    );
  }
  return delayMs;
}

function pick<T>(
  variable: string,
  choice: string | undefined,
  available: Record<string, (options: ProviderOptions) => T>,
  options: ProviderOptions,
): T {
  const name = choice ?? "mock";
  const build = available[name];
  if (!build) {
    throw new Error(
      `${variable} "${name}" is not available. Supported: ${Object.keys(available).join(", ")}.`,
    );
  }
  return build(options);
}

export function createProviders(env: Record<string, string | undefined>) {
  const options = { mockDelayMs: readMockDelayMs(env.MOCK_DELAY_MS) };
  return {
    search: pick("SEARCH_PROVIDER", env.SEARCH_PROVIDER, searchProviders, options),
    llm: pick("LLM_PROVIDER", env.LLM_PROVIDER, llmProviders, options),
  };
}
