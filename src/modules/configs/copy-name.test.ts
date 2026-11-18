import { describe, expect, it } from "vitest";
import { copyName } from "./copy-name";

describe("copyName", () => {
  it("adds a copy suffix to a name that has none", () => {
    expect(copyName("Gulf brands SEO", ["Gulf brands SEO"], 120)).toBe("Gulf brands SEO (copy)");
  });

  it("numbers the next copy instead of stacking suffixes", () => {
    const taken = ["Gulf brands SEO", "Gulf brands SEO (copy)"];
    expect(copyName("Gulf brands SEO", taken, 120)).toBe("Gulf brands SEO (copy 2)");
    expect(copyName("Gulf brands SEO (copy)", taken, 120)).toBe("Gulf brands SEO (copy 2)");
  });

  it("takes the first free number when a copy in between was deleted", () => {
    const taken = ["Physio chains", "Physio chains (copy 2)", "Physio chains (copy 3)"];
    expect(copyName("Physio chains (copy 3)", taken, 120)).toBe("Physio chains (copy)");
  });

  it("keeps a name that only looks like a copy in the middle", () => {
    expect(copyName("Notes (copy) for Quayside", [], 120)).toBe("Notes (copy) for Quayside (copy)");
  });

  it("shortens the base so the suffix always fits the length limit", () => {
    const long = "Clinic groups replacing their patient portal";
    const copy = copyName(long, [], 30);
    expect(copy).toBe("Clinic groups replacing (copy)");
    expect(copy.length).toBeLessThanOrEqual(30);
  });
});
