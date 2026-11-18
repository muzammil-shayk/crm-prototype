import { describe, expect, it } from "vitest";
import { focusAfterRemoval } from "./filter-configs";

describe("focusAfterRemoval", () => {
  it("moves to the next row, then the previous one, then nowhere", () => {
    expect(focusAfterRemoval(["a", "b", "c"], "b")).toBe("c");
    expect(focusAfterRemoval(["a", "b", "c"], "c")).toBe("b");
    expect(focusAfterRemoval(["a"], "a")).toBeNull();
    expect(focusAfterRemoval(["a"], "gone")).toBeNull();
  });
});
