import { describe, expect, it } from "vitest";
import { highlight } from "./highlight";

describe("highlight", () => {
  it("marks each quoted sentence once, in body order", () => {
    const body = "We need a portal. Budget is $40k. Start in January.";
    expect(highlight(body, ["Start in January.", "We need a portal.", "not in body"])).toEqual([
      { text: "We need a portal.", marked: true },
      { text: " Budget is $40k. ", marked: false },
      { text: "Start in January.", marked: true },
    ]);
  });
});
