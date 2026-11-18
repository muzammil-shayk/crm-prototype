"use client";

import { useCallback, useEffect, useState } from "react";

export type Resource<T> =
  { status: "loading" } | { status: "ready"; data: T } | { status: "error"; error: unknown };

interface Settled<T> {
  load: () => Promise<T>;
  attempt: number;
  result: Resource<T>;
}

const LOADING = { status: "loading" } as const;

export function useResource<T>(load: () => Promise<T>, initial?: T) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(() =>
    initial === undefined ? null : { load, attempt: 0, result: { status: "ready", data: initial } },
  );
  useEffect(() => {
    let live = true;
    load().then(
      (data) => {
        if (live) setSettled({ load, attempt, result: { status: "ready", data } });
      },
      (error: unknown) => {
        if (!live) return;
        setSettled((shown) =>
          shown?.load === load && shown.attempt === attempt && shown.result.status === "ready"
            ? shown
            : { load, attempt, result: { status: "error", error } },
        );
      },
    );
    return () => {
      live = false;
    };
  }, [load, attempt]);

  const reload = useCallback(() => {
    setAttempt((count) => count + 1);
  }, []);

  const update = useCallback((change: (data: T) => T) => {
    setSettled((current) =>
      current?.result.status === "ready"
        ? { ...current, result: { status: "ready", data: change(current.result.data) } }
        : current,
    );
  }, []);

  const current = settled && settled.load === load && settled.attempt === attempt;
  const resource: Resource<T> = current ? settled.result : LOADING;
  return { resource, reload, update };
}
