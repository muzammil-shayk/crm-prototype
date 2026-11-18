import { describe, expect, it } from "vitest";
import { matchesIndustry, matchesLocation } from "./target-filters";

describe("matchesLocation", () => {
  it("accepts any place when no locations are set", () => {
    expect(matchesLocation("Berlin, Germany", [])).toBe(true);
    expect(matchesLocation("", [])).toBe(true);
  });

  it("matches a target named inside the post's location, ignoring case", () => {
    expect(matchesLocation("Dubai, United Arab Emirates", ["dubai"])).toBe(true);
    expect(matchesLocation("Abu Dhabi, United Arab Emirates", ["Dubai"])).toBe(false);
  });

  it("matches whole words only", () => {
    expect(matchesLocation("Kentucky, United States", ["Kent"])).toBe(false);
  });

  it("matches a post whose location is named inside a longer target", () => {
    expect(matchesLocation("Pakistan", ["Lahore, Pakistan"])).toBe(true);
  });

  it("expands a country name or short form to its cities", () => {
    expect(matchesLocation("Sharjah", ["UAE"])).toBe(true);
    expect(matchesLocation("Abu Dhabi, United Arab Emirates", ["uae"])).toBe(true);
    expect(matchesLocation("Karachi", ["Pakistan"])).toBe(true);
    expect(matchesLocation("Leeds", ["UK"])).toBe(true);
    expect(matchesLocation("Manchester", ["United Kingdom"])).toBe(true);
    expect(matchesLocation("Riyadh", ["KSA"])).toBe(true);
    expect(matchesLocation("Austin", ["USA"])).toBe(true);
  });

  it("does not let a city stand for its country", () => {
    expect(matchesLocation("Karachi, Pakistan", ["Lahore"])).toBe(false);
  });

  it("keeps a remote post only when Remote is a target", () => {
    expect(matchesLocation("Remote", ["remote"])).toBe(true);
    expect(matchesLocation("Remote (UK hours)", ["Remote"])).toBe(true);
    expect(matchesLocation("Remote (Pakistan)", ["Pakistan"])).toBe(false);
    expect(matchesLocation("Remote (UK hours)", ["United Kingdom"])).toBe(false);
  });

  it("does not let Remote stand for an office location", () => {
    expect(matchesLocation("London, United Kingdom", ["Remote"])).toBe(false);
  });

  it("drops a post with no stated location", () => {
    expect(matchesLocation("", ["United Kingdom"])).toBe(false);
    expect(matchesLocation("  ", ["Remote"])).toBe(false);
  });
});

describe("matchesLocation with oversized or hostile locations", () => {
  const manyWords = Array.from({ length: 2000 }, () => "Pakistan").join(" ");
  const longRun = "x".repeat(50_000);
  const metacharacters = "(((Lahore)+)+)$ [a-z]* \\ ^?";

  it("does not throw on a location of 2,000 words", () => {
    expect(() => matchesLocation(manyWords, ["Lahore, Pakistan"])).not.toThrow();
  });

  it("does not throw on a 50,000-character location", () => {
    expect(() => matchesLocation(longRun, [`Lahore ${longRun}`])).not.toThrow();
  });

  it("drops a location longer than 200 characters under an active filter", () => {
    expect(matchesLocation(`Lahore, Pakistan ${"x".repeat(200)}`, ["Pakistan"])).toBe(false);
    expect(matchesLocation(manyWords, ["Pakistan"])).toBe(false);
  });

  it("still accepts an oversized location when no locations are set", () => {
    expect(matchesLocation(longRun, [])).toBe(true);
  });

  it("treats regex symbols in the location as plain text", () => {
    expect(() => matchesLocation(metacharacters, ["Lahore, Pakistan"])).not.toThrow();
    expect(matchesLocation("Lahore (Pakistan", ["Lahore, Pakistan"])).toBe(true);
    expect(matchesLocation("L.hore", ["Lahore, Pakistan"])).toBe(false);
  });

  it("treats regex symbols in a target as plain text", () => {
    expect(matchesLocation("Lahore, Pakistan", ["(Lahore"])).toBe(true);
    expect(matchesLocation("Lahore, Pakistan", ["L.hore"])).toBe(false);
  });
});

describe("matchesIndustry", () => {
  it("accepts any industry when none are set", () => {
    expect(matchesIndustry("logistics", [])).toBe(true);
    expect(matchesIndustry("", [])).toBe(true);
  });

  it("keeps only the target industries, ignoring case", () => {
    expect(matchesIndustry("Healthcare", ["healthcare", "fintech"])).toBe(true);
    expect(matchesIndustry("logistics", ["healthcare", "fintech"])).toBe(false);
  });

  it("compares an oversized industry as plain text", () => {
    expect(matchesIndustry(`healthcare ${"(a+)+".repeat(10_000)}`, ["healthcare"])).toBe(false);
  });

  it("drops a post with no stated industry", () => {
    expect(matchesIndustry("", ["healthcare"])).toBe(false);
  });
});
