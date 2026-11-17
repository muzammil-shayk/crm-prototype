import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, seedOrganizations } from "../../../test/database";
import { read } from "../../../test/http";
import { organizationRoutes } from "./organization-routes";

describe("organization routes", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedOrganizations();
  });

  it("lists organizations under `organizations`", async () => {
    const { status, body } = await read(
      await organizationRoutes.GET(new Request("http://localhost/api/organizations"), {}),
    );

    expect(status).toBe(200);
    expect(body).toMatchObject({
      organizations: [{ name: "Kestrel Mobile" }, { name: "Northwind Data Studio" }],
    });
  });
});
