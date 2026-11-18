"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type RunSnapshot } from "@/api-client/api";
import { ApiError } from "@/api-client/api-error";
import type { Lead, SearchRun } from "@/api-client/types";

export const POLL_INTERVAL_MS = 500;
const RETRY_AFTER_ERROR_MS = 2000;

interface PollState {
  runId: string;
  snapshot: RunSnapshot | null;
  error: unknown;
}

export function useRunPolling(runId: string | null, initial?: RunSnapshot) {
  const [state, setState] = useState<PollState | null>(() =>
    initial && initial.run.id === runId ? { runId, snapshot: initial, error: null } : null,
  );

  useEffect(() => {
    if (!runId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const snapshot = await api.searches.get(runId, controller.signal);
        setState({ runId, snapshot, error: null });
        if (snapshot.run.status === "running") timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
      } catch (error) {
        if (controller.signal.aborted) return;
        setState((current) => ({
          runId,
          snapshot: current?.runId === runId ? current.snapshot : null,
          error,
        }));
        const gone = error instanceof ApiError && error.code === "not_found";
        if (!gone) timer = setTimeout(() => void poll(), RETRY_AFTER_ERROR_MS);
      }
    };

    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [runId]);

  const current = state && state.runId === runId ? state : null;

  const patch = useCallback((change: (snapshot: RunSnapshot) => RunSnapshot) => {
    setState((existing) =>
      existing?.snapshot ? { ...existing, snapshot: change(existing.snapshot) } : existing,
    );
  }, []);

  const applyRun = useCallback(
    (run: SearchRun) => {
      patch((snapshot) => ({ ...snapshot, run }));
    },
    [patch],
  );

  const applyLead = useCallback(
    (lead: Lead) => {
      patch((snapshot) => ({
        ...snapshot,
        leads: snapshot.leads.map((existing) => (existing.id === lead.id ? lead : existing)),
      }));
    },
    [patch],
  );

  return { snapshot: current?.snapshot ?? null, error: current?.error ?? null, applyRun, applyLead };
}
