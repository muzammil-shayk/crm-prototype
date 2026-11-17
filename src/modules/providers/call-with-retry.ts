import { setTimeout as sleep } from "node:timers/promises";
import { describeError, ProviderError } from "@/lib/errors";

export interface RetryOptions {
  provider: "search" | "llm";
  attempts: number;
  timeoutMs: number;
  backoffMs: number;
  budget: { trySpend(): boolean };
  signal?: AbortSignal;
}

export class CostLimitReachedError extends Error {
  constructor() {
    super("The run reached its cost limit.");
    this.name = "CostLimitReachedError";
  }
}

function cancellationReason(run: AbortSignal): Error {
  const reason: unknown = run.reason;
  return reason instanceof Error ? reason : new DOMException("The run was cancelled.", "AbortError");
}

function withTimeout<T>(operation: (signal: AbortSignal) => Promise<T>, options: RetryOptions): Promise<T> {
  const attempt = new AbortController();
  const signal = options.signal ? AbortSignal.any([options.signal, attempt.signal]) : attempt.signal;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopListening: () => void = () => {};
  const timeoutOrCancel = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      attempt.abort();
      reject(new Error(`timed out after ${options.timeoutMs} ms`));
    }, options.timeoutMs);
    const run = options.signal;
    if (!run) return;
    const onCancel = () => {
      reject(cancellationReason(run));
    };
    run.addEventListener("abort", onCancel, { once: true });
    stopListening = () => {
      run.removeEventListener("abort", onCancel);
    };
  });
  return Promise.race([operation(signal), timeoutOrCancel]).finally(() => {
    clearTimeout(timer);
    stopListening();
  });
}

export async function callWithRetry<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  let lastReason = "no attempts were made";
  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    options.signal?.throwIfAborted();
    if (!options.budget.trySpend()) throw new CostLimitReachedError();
    try {
      return await withTimeout(operation, options);
    } catch (error) {
      options.signal?.throwIfAborted();
      lastReason = describeError(error);
      if (attempt < options.attempts) {
        await sleep(options.backoffMs * attempt, undefined, { signal: options.signal }).catch(() => {
          options.signal?.throwIfAborted();
        });
      }
    }
  }
  const noun = options.attempts === 1 ? "attempt" : "attempts";
  throw new ProviderError(options.provider, `${lastReason} (after ${options.attempts} ${noun})`);
}
