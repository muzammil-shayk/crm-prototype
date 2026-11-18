import { beforeEach, describe, expect, it } from "vitest";
import { createConfig } from "@/modules/configs/config-service";
import { resetDatabase } from "../../../test/database";
import { idContext, jsonRequest, read } from "../../../test/http";
import { cancelSearchRoute, searchCollectionRoutes, searchItemRoutes } from "./search-routes";

async function waitUntilSettled(id: string) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const { body } = await read(
      await searchItemRoutes.GET(jsonRequest("GET", `/api/searches/${id}`), idContext(id)),
    );
    const view = body as {
      run: { status: string; tierCounts: Record<string, number> };
      leads: { tier: string; evidence: string[] }[];
    };
    if (view.run.status !== "running") return view;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("search did not settle");
}

describe("search routes", () => {
  beforeEach(resetDatabase);

  it("starts a search with 202 and a Location to poll, then serves tiered leads", async () => {
    const config = await createConfig({
      type: "buyers-seeking-providers",
      name: "Clinics",
      criteria: { keywords: ["patient portal"] },
    });

    const response = await searchCollectionRoutes.POST(
      jsonRequest("POST", "/api/searches", { configId: config.id }),
      {},
    );
    const { body } = await read(response);
    const { id: runId, tierCounts } = (body as { run: { id: string; tierCounts: unknown } }).run;

    expect(response.status).toBe(202);
    expect(tierCounts).toEqual({ strong: 0, medium: 0, weak: 0 });
    expect(response.headers.get("location")).toBe(`/api/searches/${runId}`);
    const view = await waitUntilSettled(runId);
    expect(view.run.status).toBe("completed");
    expect(view.leads.length).toBeGreaterThan(0);
    const counted = { strong: 0, medium: 0, weak: 0, ...view.run.tierCounts };
    for (const lead of view.leads) counted[lead.tier as keyof typeof counted] -= 1;
    expect(counted).toEqual({ strong: 0, medium: 0, weak: 0 });
  });

  it("answers 400 when configId is missing", async () => {
    const response = await read(
      await searchCollectionRoutes.POST(jsonRequest("POST", "/api/searches", {}), {}),
    );
    expect(response.body).toMatchObject({
      error: { code: "validation_failed", details: [{ path: "configId" }] },
    });
  });

  it("answers 404 for an unknown run and 409 when cancelling a finished one", async () => {
    const config = await createConfig({
      type: "buyers-seeking-providers",
      name: "Clinics",
      criteria: { keywords: ["patient portal"] },
    });
    const started = await read(
      await searchCollectionRoutes.POST(jsonRequest("POST", "/api/searches", { configId: config.id }), {}),
    );
    const runId = (started.body as { run: { id: string } }).run.id;
    await waitUntilSettled(runId);

    const missing = await read(
      await searchItemRoutes.GET(
        jsonRequest("GET", "/api/searches/x"),
        idContext("cm0missing00000000000000"),
      ),
    );
    const cancel = await read(
      await cancelSearchRoute.POST(jsonRequest("POST", `/api/searches/${runId}/cancel`), idContext(runId)),
    );

    expect(missing.status).toBe(404);
    expect(cancel).toMatchObject({ status: 409, body: { error: { code: "run_not_cancellable" } } });
  });

  it("rejects unknown fields in the start request", async () => {
    const response = await read(
      await searchCollectionRoutes.POST(
        jsonRequest("POST", "/api/searches", { configId: "cm0missing00000000000000", force: true }),
        {},
      ),
    );
    expect(response.body).toMatchObject({
      error: { details: [{ path: "force", message: "Unknown field" }] },
    });
  });

  it("lists runs under `runs`", async () => {
    const response = await read(await searchCollectionRoutes.GET(jsonRequest("GET", "/api/searches"), {}));
    expect(response).toEqual({ status: 200, body: { runs: [] } });
  });
});
