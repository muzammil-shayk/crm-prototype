import { describe, expect, it } from "vitest";
import type { FieldDefinition } from "@/api-client/types";
import { firstInvalidKey, mapIssues, validateEnvelope } from "./config-draft";

const keywords: FieldDefinition = {
  key: "keywords",
  kind: "tags",
  label: "Keywords",
  help: "",
  required: true,
};

describe("mapIssues", () => {
  it("places criteria issues on their field and keeps the first message per field", () => {
    const { fieldErrors, unplaced } = mapIssues(
      [
        { path: "name", message: "Give the search a name" },
        { path: "criteria.keywords.0", message: "Keep each entry under 80 characters" },
        { path: "criteria.keywords", message: "Add at least one keyword or phrase" },
        { path: "criteria.unknown", message: "Not a field" },
      ],
      [keywords],
    );
    expect(fieldErrors).toEqual({
      name: "Give the search a name",
      keywords: "Keep each entry under 80 characters",
    });
    expect(unplaced).toEqual(["Not a field"]);
    expect(firstInvalidKey(fieldErrors, ["name", "keywords"])).toBe("name");
  });

  it("validates the name and description like the server", () => {
    expect(validateEnvelope("  ", "")).toEqual({ name: "Give the search a name" });
    expect(validateEnvelope("Ok", "x".repeat(4001))).toHaveProperty("description");
  });
});
