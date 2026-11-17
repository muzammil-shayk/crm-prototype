import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "../../../test/database";
import { idContext, jsonRequest, read } from "../../../test/http";
import { leadCollectionRoutes, leadItemRoutes } from "./lead-routes";

describe("lead routes", () => {
  beforeEach(resetDatabase);

  it("lists leads under `leads` and validates the filters", async () => {
    const ok = await read(await leadCollectionRoutes.GET(jsonRequest("GET", "/api/leads?status=new"), {}));
    const bad = await read(await leadCollectionRoutes.GET(jsonRequest("GET", "/api/leads?tier=hot"), {}));

    expect(ok).toEqual({ status: 200, body: { leads: [] } });
    expect(bad).toEqual({
      status: 400,
      body: {
        error: {
          code: "validation_failed",
          message: "The request has 1 invalid field.",
          details: [{ path: "tier", message: "Tier must be one of: strong, medium, weak" }],
        },
      },
    });
  });

  it("rejects unknown query parameters and unknown body fields", async () => {
    const query = await read(await leadCollectionRoutes.GET(jsonRequest("GET", "/api/leads?colour=red"), {}));
    const body = await read(
      await leadItemRoutes.PATCH(
        jsonRequest("PATCH", "/api/leads/x", { status: "contacted", note: "called" }),
        idContext("cm0missing00000000000000"),
      ),
    );

    expect(query.body).toMatchObject({ error: { details: [{ path: "colour", message: "Unknown field" }] } });
    expect(body.body).toMatchObject({ error: { details: [{ path: "note", message: "Unknown field" }] } });
  });

  it("answers 404 when changing the status of an unknown lead", async () => {
    const response = await read(
      await leadItemRoutes.PATCH(
        jsonRequest("PATCH", "/api/leads/x", { status: "contacted" }),
        idContext("cm0missing00000000000000"),
      ),
    );
    expect(response).toMatchObject({ status: 404, body: { error: { code: "not_found" } } });
  });
});
