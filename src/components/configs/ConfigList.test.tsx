// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { SearchConfigSummary } from "@/api-client/types";
import { NO_FILTER } from "./filter-configs";
import { ConfigList } from "./ConfigList";

afterEach(cleanup);

const base: SearchConfigSummary = {
  id: "cfg-physio",
  type: "buyers-seeking-providers",
  name: "Physio chains adding online booking",
  description: "",
  criteria: { keywords: ["physio"], excludedKeywords: [], industries: [], locations: [], rules: "" },
  createdAt: "2026-11-18T09:00:00.000Z",
  updatedAt: "2026-11-18T09:00:00.000Z",
  lastRun: null,
  runCount: 0,
};

const ran: SearchConfigSummary = {
  ...base,
  id: "cfg-claims",
  name: "Insurers automating claims intake",
  runCount: 2,
  lastRun: {
    id: "run-9",
    status: "completed",
    startedAt: "2026-11-18T10:00:00.000Z",
    finishedAt: "2026-11-18T10:00:05.000Z",
    tierCounts: { strong: 4, medium: 6, weak: 4 },
  },
};

function list() {
  const noop = () => undefined;
  render(
    <ConfigList
      configs={[base, ran]}
      types={[]}
      filter={NO_FILTER}
      busyId={null}
      onClearFilter={noop}
      onRun={noop}
      onDuplicate={noop}
      onDelete={noop}
    />,
  );
}

describe("ConfigList", () => {
  it("shows a quiet dash for a config that never ran, named for screen readers", () => {
    list();
    expect(screen.queryByText(/Run search to fetch its first leads/)).toBeNull();
    expect(screen.getByText("Never run").className).toBe("visually-hidden");
  });

  it("lets the tier bar link to the last run", () => {
    list();
    const link = screen.getAllByRole("link").find((item) => item.textContent.startsWith("14 leads"));
    expect(link?.getAttribute("href")).toBe("/search?config=cfg-claims&run=run-9");
    expect(link?.textContent).toBe("14 leads, open this runStrong4Medium6Weak4");
  });

  it("keeps Run search and Edit visible and moves the rest into a menu", () => {
    list();
    expect(screen.getAllByRole("button", { name: "Run search" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Edit" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Duplicate" })).toBeNull();
    expect(screen.getByRole("button", { name: `More actions for ${ran.name}` })).toBeTruthy();
  });
});
