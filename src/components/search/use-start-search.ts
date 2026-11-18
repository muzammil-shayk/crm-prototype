"use client";

import { useState } from "react";
import { describeApiError } from "@/api-client/api-error";
import { startOrResumeSearch } from "./start-search";

export function useStartSearch(onStarted: (configId: string, runId: string) => void) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async (configId: string) => {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const run = await startOrResumeSearch(configId);
      onStarted(configId, run.id);
    } catch (problem) {
      setError(describeApiError(problem));
    } finally {
      setStarting(false);
    }
  };

  return {
    starting,
    error,
    start,
    clearError: () => {
      setError(null);
    },
  };
}
