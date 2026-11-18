"use client";

import { useSyncExternalStore } from "react";
import { formatRelative } from "@/components/format";

const TICK_MS = 30_000;

let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function tick() {
  now = Date.now();
  for (const listener of listeners) listener();
}

function tickWhenVisible() {
  if (document.visibilityState === "visible") tick();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    now = Date.now();
    timer = setInterval(tick, TICK_MS);
    document.addEventListener("visibilitychange", tickWhenVisible);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    clearInterval(timer);
    document.removeEventListener("visibilitychange", tickWhenVisible);
  };
}

const clientNow = () => now;
const serverNow = () => (typeof window === "undefined" ? Date.now() : now);

export function RelativeTime({ iso }: { iso: string }) {
  const current = useSyncExternalStore(subscribe, clientNow, serverNow);
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {formatRelative(iso, current)}
    </time>
  );
}
