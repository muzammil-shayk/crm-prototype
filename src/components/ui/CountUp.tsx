"use client";

import { useLayoutEffect, useRef } from "react";

export const COUNT_UP_MS = 900;
export const FOLLOW_MS = 450;

export function countBetween(from: number, to: number, elapsedMs: number, durationMs: number): number {
  const t = Math.min(Math.max(elapsedMs / durationMs, 0), 1);
  return Math.round(from + (to - from) * (1 - (1 - t) ** 3));
}

export function countAt(target: number, elapsedMs: number, durationMs = COUNT_UP_MS): number {
  return countBetween(0, target, elapsedMs, durationMs);
}

interface CountUpProps {
  value: number;
  play: boolean;
  follow?: boolean;
  delayMs?: number;
}

export function CountUp({ value, play, follow = false, delayMs = 0 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const from = play ? 0 : follow ? shown.current : value;
    if (from === value || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.textContent = String(value);
      shown.current = value;
      return;
    }
    const duration = play ? COUNT_UP_MS : FOLLOW_MS;
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now;
      shown.current = countBetween(from, value, now - start - delayMs, duration);
      node.textContent = String(shown.current);
      if (now - start < delayMs + duration) frame = requestAnimationFrame(tick);
    };
    node.textContent = String(from);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [value, play, follow, delayMs]);

  return <span ref={ref}>{value}</span>;
}
