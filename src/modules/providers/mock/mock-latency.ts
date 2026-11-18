import { setTimeout as sleep } from "node:timers/promises";

export async function simulateLatency(delayMs: number, signal: AbortSignal): Promise<void> {
  if (delayMs > 0) await sleep(delayMs, undefined, { signal });
}
