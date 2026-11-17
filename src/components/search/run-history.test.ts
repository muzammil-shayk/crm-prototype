import { describe, expect, it } from "vitest";
import type { SearchRun } from "@/api-client/types";
import { mergeRun } from "./RunHistory";

describe("mergeRun", () => {
  const run = (id: string, status: SearchRun["status"]) => ({ id, status }) as SearchRun;

  it("replaces a listed run with its live copy, or puts a new run first", () => {
    expect(mergeRun([run("a", "running")], run("a", "completed"))).toEqual([run("a", "completed")]);
    expect(mergeRun([run("a", "completed")], run("b", "running")).map((item) => item.id)).toEqual(["b", "a"]);
  });
});
