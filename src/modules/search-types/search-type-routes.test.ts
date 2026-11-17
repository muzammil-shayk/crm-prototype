import { describe, expect, it } from "vitest";
import { read } from "../../../test/http";
import { searchTypeRoutes } from "./search-type-routes";

describe("search type routes", () => {
  it("serves each type's fields without its schema", async () => {
    const { status, body } = await read(
      await searchTypeRoutes.GET(new Request("http://localhost/api/search-types"), {}),
    );
    const types = (body as { searchTypes: { id: string; fields: { key: string }[] }[] }).searchTypes;

    expect(status).toBe(200);
    expect(types.map((type) => type.id)).toEqual(["buyers-seeking-providers", "jobs-for-our-organizations"]);
    expect(types[1]?.fields.map((field) => field.key)).toContain("servicesToMatch");
    expect(JSON.stringify(body)).not.toContain("criteriaSchema");
  });
});
