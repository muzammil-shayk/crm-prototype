import { beforeEach, describe, expect, it } from "vitest";
import { idContext, jsonRequest, read } from "../../../test/http";
import { resetDatabase } from "../../../test/database";
import { configCollectionRoutes, configItemRoutes, duplicateConfigRoute } from "./config-routes";

const validBody = {
  type: "jobs-for-our-organizations",
  name: "Data contracts",
  description: "Contracts our data studio can deliver remotely.",
  criteria: { keywords: ["data pipeline"], servicesToMatch: ["dbt"] },
};

async function createOne() {
  const { body } = await read(
    await configCollectionRoutes.POST(jsonRequest("POST", "/api/configs", validBody), {}),
  );
  return (body as { config: { id: string } }).config.id;
}

describe("config routes", () => {
  beforeEach(resetDatabase);

  it("creates a config with 201 and returns it under `config`", async () => {
    const response = await read(
      await configCollectionRoutes.POST(jsonRequest("POST", "/api/configs", validBody), {}),
    );

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      config: { name: "Data contracts", type: "jobs-for-our-organizations" },
    });
  });

  it("answers 400 with a detail per invalid field", async () => {
    const body = { ...validBody, name: "", criteria: { keywords: [], servicesToMatch: ["dbt"] } };

    const response = await read(
      await configCollectionRoutes.POST(jsonRequest("POST", "/api/configs", body), {}),
    );

    expect(response).toEqual({
      status: 400,
      body: {
        error: {
          code: "validation_failed",
          message: "The request has 2 invalid fields.",
          details: [
            { path: "name", message: "Give the search a name" },
            { path: "criteria.keywords", message: "Add at least one keyword or phrase" },
          ],
        },
      },
    });
  });

  it("answers 400 naming fields the API does not know", async () => {
    const body = { ...validBody, id: "abc", criteria: { ...validBody.criteria, colour: "red" } };

    const response = await read(
      await configCollectionRoutes.POST(jsonRequest("POST", "/api/configs", body), {}),
    );

    expect(response.body).toMatchObject({
      error: {
        code: "validation_failed",
        details: [
          { path: "criteria.colour", message: "Unknown field" },
          { path: "id", message: "Unknown field" },
        ],
      },
    });
  });

  it("answers 400 for a body that is not JSON", async () => {
    const response = await read(
      await configCollectionRoutes.POST(jsonRequest("POST", "/api/configs", "{"), {}),
    );
    expect(response.body).toMatchObject({ error: { code: "malformed_json" } });
  });

  it("lists configs under `configs`", async () => {
    await createOne();
    const response = await read(await configCollectionRoutes.GET(jsonRequest("GET", "/api/configs"), {}));
    const { configs } = response.body as { configs: unknown[] };
    expect(configs).toHaveLength(1);
    expect(configs[0]).toMatchObject({ lastRun: null, runCount: 0 });
  });

  it("answers 400 for a malformed id and 404 for an unknown one", async () => {
    const malformed = await read(
      await configItemRoutes.GET(jsonRequest("GET", "/api/configs/x"), idContext("../etc")),
    );
    const unknown = await read(
      await configItemRoutes.GET(jsonRequest("GET", "/api/configs/x"), idContext("cm0missing00000000000000")),
    );

    expect(malformed.body).toMatchObject({ error: { code: "validation_failed", details: [{ path: "id" }] } });
    expect(unknown).toEqual({
      status: 404,
      body: {
        error: { code: "not_found", message: "Search config cm0missing00000000000000 was not found." },
      },
    });
  });

  it("updates with PUT, duplicates with 201 and deletes with 204", async () => {
    const id = await createOne();

    const updated = await read(
      await configItemRoutes.PUT(
        jsonRequest("PUT", "/api/configs/x", { ...validBody, name: "Renamed" }),
        idContext(id),
      ),
    );
    const copy = await read(
      await duplicateConfigRoute.POST(jsonRequest("POST", "/api/configs/x/duplicate"), idContext(id)),
    );
    const deleted = await configItemRoutes.DELETE(jsonRequest("DELETE", "/api/configs/x"), idContext(id));

    expect(updated.body).toMatchObject({ config: { id, name: "Renamed" } });
    expect(copy).toMatchObject({ status: 201, body: { config: { name: "Renamed (copy)" } } });
    expect(deleted.status).toBe(204);
  });
});
