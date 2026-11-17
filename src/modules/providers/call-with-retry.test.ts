import { describe, expect, it } from "vitest";
import { ProviderError } from "@/lib/errors";
import { CostBudget } from "@/modules/search/cost-budget";
import { callWithRetry, CostLimitReachedError } from "./call-with-retry";

const options = {
  provider: "search",
  attempts: 3,
  timeoutMs: 50,
  backoffMs: 1,
  budget: new CostBudget(1000),
} as const;

describe("callWithRetry", () => {
  it("returns the first successful result after transient failures", async () => {
    let calls = 0;
    const value = await callWithRetry(() => {
      calls += 1;
      return calls < 3 ? Promise.reject(new Error("503 from upstream")) : Promise.resolve("ok");
    }, options);

    expect({ value, calls }).toEqual({ value: "ok", calls: 3 });
  });

  it("gives up after the allowed attempts with a provider error naming the last cause", async () => {
    let calls = 0;
    const attempt = callWithRetry(() => {
      calls += 1;
      return Promise.reject(new Error("503 from upstream"));
    }, options);

    await expect(attempt).rejects.toThrow(
      new ProviderError("search", "503 from upstream (after 3 attempts)"),
    );
    expect(calls).toBe(3);
  });

  it("aborts an attempt that runs past the timeout", async () => {
    const seen: boolean[] = [];
    const attempt = callWithRetry(
      (signal) =>
        new Promise<string>((resolve) => {
          setTimeout(() => {
            seen.push(signal.aborted);
            resolve("late");
          }, 80);
        }),
      { ...options, attempts: 1 },
    );

    await expect(attempt).rejects.toThrow("timed out after 50 ms (after 1 attempt)");
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(seen).toEqual([true]);
  });

  it("rejects as soon as the run is cancelled, even if the provider ignores its signal", async () => {
    const run = new AbortController();
    const attempt = callWithRetry(() => new Promise<string>(() => undefined), {
      ...options,
      timeoutMs: 5000,
      signal: run.signal,
    });
    setTimeout(() => {
      run.abort();
    }, 10);

    const started = Date.now();
    await expect(attempt).rejects.toThrow(DOMException);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("charges one cost unit per attempt and stops when the budget is spent", async () => {
    const budget = new CostBudget(2);
    let calls = 0;
    const attempt = callWithRetry(
      () => {
        calls += 1;
        return Promise.reject(new Error("503 from upstream"));
      },
      { ...options, budget },
    );

    await expect(attempt).rejects.toBeInstanceOf(CostLimitReachedError);
    expect({ calls, spent: budget.spent, exhausted: budget.exhausted }).toEqual({
      calls: 2,
      spent: 2,
      exhausted: true,
    });
  });

  it("waits out the backoff only until the run is cancelled", async () => {
    const run = new AbortController();
    const attempt = callWithRetry(() => Promise.reject(new Error("503 from upstream")), {
      ...options,
      backoffMs: 5000,
      signal: run.signal,
    });
    setTimeout(() => {
      run.abort();
    }, 20);

    const started = Date.now();
    await expect(attempt).rejects.toThrow(DOMException);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("stops retrying once the run is cancelled", async () => {
    const run = new AbortController();
    let calls = 0;
    const attempt = callWithRetry(
      () => {
        calls += 1;
        run.abort();
        return Promise.reject(new Error("503 from upstream"));
      },
      { ...options, signal: run.signal },
    );

    await expect(attempt).rejects.toThrow(DOMException);
    expect(calls).toBe(1);
  });
});
