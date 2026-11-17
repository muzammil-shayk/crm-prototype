import { z } from "zod";

export function parseJsonOrUndefined(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

const stringList = z.array(z.string());

export function parseStringList(text: string): string[] {
  const parsed = stringList.safeParse(parseJsonOrUndefined(text));
  return parsed.success ? parsed.data : [];
}
