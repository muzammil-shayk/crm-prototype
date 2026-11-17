import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { resetDatabase, seedOrganizations } from "../../../test/database";
import { listOrganizations } from "./organization-repository";

describe("listOrganizations", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedOrganizations();
  });

  it("returns organizations by name with their services as a list", async () => {
    const organizations = await listOrganizations();

    expect(organizations.map((organization) => organization.name)).toEqual([
      "Kestrel Mobile",
      "Northwind Data Studio",
    ]);
    expect(organizations[1]?.services).toEqual(["data engineering", "dbt", "Snowflake"]);
  });

  it("reads a corrupted services column as an empty list instead of failing", async () => {
    await db.organization.update({ where: { name: "Kestrel Mobile" }, data: { services: "not json" } });

    const [kestrel] = await listOrganizations();

    expect(kestrel?.services).toEqual([]);
  });
});
