import { describe, expect, it } from "vitest";
import { stableHash } from "./stable-hash";

describe("stableHash", () => {
  it("ignores key order", () => {
    expect(stableHash({ a: 1, b: { c: [1, 2], d: "x" } })).toBe(
      stableHash({ b: { d: "x", c: [1, 2] }, a: 1 }),
    );
  });

  it("changes when a value changes", () => {
    expect(stableHash({ keywords: ["dbt"] })).not.toBe(stableHash({ keywords: ["dbt", "airflow"] }));
  });

  it("keeps array order significant", () => {
    expect(stableHash([1, 2])).not.toBe(stableHash([2, 1]));
  });

  it("returns a 64 character hex digest", () => {
    expect(stableHash({})).toMatch(/^[0-9a-f]{64}$/);
  });
});
