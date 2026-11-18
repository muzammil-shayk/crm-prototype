import type { Json } from "./types";

function convert(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(convert);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, convert(item)]));
  }
  return value;
}

export const toJson = <T>(value: T): Json<T> => convert(value) as Json<T>;
