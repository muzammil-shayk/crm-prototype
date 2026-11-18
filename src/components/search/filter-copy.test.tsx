// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { RunStats, SearchConfigSummary, SearchType } from "@/api-client/types";
import { ConfigBrief, targetRules } from "./ConfigBrief";
import { biggestFilter, noMatchAdvice, RunStatsList } from "./RunOutcome";

afterEach(cleanup);

const types: SearchType[] = [
  {
    id: "buyers-seeking-providers",
    label: "Organizations looking for providers",
    description: "",
    fields: [
      {
        key: "industries",
        label: "Industries",
        help: "",
        required: false,
        kind: "multiselect",
        options: [
          { value: "real-estate", label: "Real estate" },
          { value: "ecommerce", label: "E-commerce and retail" },
        ],
      },
    ],
  },
];

const gulf: SearchConfigSummary = {
  id: "cfg-gulf",
  type: "buyers-seeking-providers",
  name: "Gulf brands shopping for SEO and content",
  description: "",
  criteria: {
    keywords: ["SEO agency"],
    excludedKeywords: [],
    industries: ["real-estate", "ecommerce"],
    locations: ["UAE", "Saudi Arabia"],
    rules: "",
  },
  createdAt: "2026-11-18T09:00:00.000Z",
  updatedAt: "2026-11-18T09:00:00.000Z",
  lastRun: null,
  runCount: 0,
};

const stats: RunStats = {
  queries: 3,
  queryFailures: 0,
  retrieved: 14,
  duplicates: 2,
  excluded: 1,
  outsideFilters: 0,
  outsideLocation: 0,
  outsideIndustry: 0,
  evaluated: 7,
  evaluationFailures: 0,
  costUnits: 10,
};

describe("targetRules", () => {
  it("accepts any location and industry when both are empty", () => {
    expect(targetRules([], [])).toEqual(["Any location and industry is accepted."]);
  });

  it("names the kept places and industries and says unlabelled posts are dropped", () => {
    expect(targetRules(["Dubai", "Abu Dhabi"], ["Real estate"])).toEqual([
      "Keeps only posts located in Dubai or Abu Dhabi.",
      "Keeps only posts whose industry is Real estate.",
      "A post that names no location or industry is dropped.",
    ]);
  });

  it("keeps remote posts only when Remote is listed", () => {
    expect(targetRules(["Remote", "Pakistan"], [])).toEqual([
      "Keeps only posts located in Pakistan, or remote.",
      "Any industry is accepted.",
      "A post that names no location is dropped.",
    ]);
    expect(targetRules(["Remote"], [])[0]).toBe("Keeps only remote posts.");
  });
});

describe("ConfigBrief", () => {
  it("spells out the config's filters with industry labels", () => {
    render(
      <ConfigBrief config={gulf} types={types} running={false} starting={false} onStart={() => undefined} />,
    );
    expect(
      screen.getByText(
        /Keeps only posts located in UAE or Saudi Arabia\. Keeps only posts whose industry is Real estate or E-commerce and retail\./,
      ),
    ).toBeTruthy();
  });
});

describe("RunStatsList", () => {
  it("hides the location and industry counts when nothing fell outside them", () => {
    render(<RunStatsList stats={stats} />);
    expect(screen.queryByText("Outside your locations")).toBeNull();
    expect(screen.queryByText("Outside your industries")).toBeNull();
    expect(screen.getAllByRole("term")).toHaveLength(6);
  });

  it("shows each filter's count on its own once it removed posts", () => {
    render(<RunStatsList stats={{ ...stats, outsideFilters: 4, outsideLocation: 4 }} />);
    expect(screen.getByText("Outside your locations").nextElementSibling?.textContent).toBe("4");
    expect(screen.queryByText("Outside your industries")).toBeNull();
  });

  it("shows one combined row for older runs that only counted filtered posts together", () => {
    render(<RunStatsList stats={{ ...stats, outsideFilters: 5 }} />);
    expect(screen.getByText("Outside your filters").nextElementSibling?.textContent).toBe("5");
    expect(screen.queryByText("Outside your locations")).toBeNull();
    expect(screen.queryByText("Outside your industries")).toBeNull();
  });
});

describe("no-match advice", () => {
  it("blames the combined filters on older runs that did not split them", () => {
    expect(biggestFilter({ ...stats, excluded: 2, outsideFilters: 7 })).toEqual({
      name: "Your location and industry filters",
      removed: 7,
    });
  });

  it("names the filter that removed the most posts", () => {
    const filtered = { ...stats, excluded: 2, outsideFilters: 9, outsideLocation: 3, outsideIndustry: 6 };
    expect(biggestFilter(filtered)).toEqual({ name: "Your industry filter", removed: 6 });
    expect(noMatchAdvice(filtered)).toBe(
      "Your industry filter removed the most: 6 of 14 posts fetched. Loosen it or try broader keywords, then run it again.",
    );
  });

  it("says when nothing came back or no filter removed anything", () => {
    expect(noMatchAdvice({ ...stats, retrieved: 0 })).toMatch(/^No posts came back/);
    expect(biggestFilter({ ...stats, excluded: 0 })).toBeNull();
    expect(noMatchAdvice({ ...stats, excluded: 0 })).toBe(
      "Try broader keywords or fewer exclusions, then run it again.",
    );
  });
});
