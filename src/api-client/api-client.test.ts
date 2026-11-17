import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";
import { ApiError, apiErrorFromBody, describeApiError } from "./api-error";

function respondWith(status: number, body?: unknown) {
  const fetchMock = vi.fn(() =>
    Promise.resolve(
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function caught(promise: Promise<unknown>): Promise<ApiError> {
  const error: unknown = await promise.then(
    () => null,
    (problem: unknown) => problem,
  );
  if (!(error instanceof ApiError)) throw new Error("Expected an ApiError");
  return error;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api client", () => {
  it("sends JSON and unwraps the response envelope", async () => {
    const fetchMock = respondWith(202, { run: { id: "run_1", status: "running" } });
    await expect(api.searches.start("cfg_1")).resolves.toEqual({ id: "run_1", status: "running" });
    expect(fetchMock).toHaveBeenCalledWith("/api/searches", {
      method: "POST",
      signal: undefined,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ configId: "cfg_1" }),
    });
  });

  it("accepts 204 with no body for deletes", async () => {
    respondWith(204);
    await expect(api.configs.remove("cfg_1")).resolves.toBeUndefined();
  });

  it("turns the error envelope into an ApiError with field details", async () => {
    respondWith(400, {
      error: {
        code: "validation_failed",
        message: "The request has 1 invalid field.",
        details: [{ path: "criteria.keywords", message: "Add at least one keyword or phrase" }],
      },
    });
    const error = await caught(
      api.configs.create({ type: "buyers-seeking-providers", name: "x", description: "", criteria: {} }),
    );
    expect(error.code).toBe("validation_failed");
    expect(error.status).toBe(400);
    expect(error.details).toEqual([
      { path: "criteria.keywords", message: "Add at least one keyword or phrase" },
    ]);
  });

  it("reports a network failure as network_error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
    );
    expect((await caught(api.configs.list())).code).toBe("network_error");
  });

  it("does not trust a body that is not the error envelope", () => {
    expect(apiErrorFromBody(502, "<html>Bad gateway</html>").code).toBe("unexpected_response");
    expect(apiErrorFromBody(418, { error: { code: "teapot", message: "No" } }).code).toBe(
      "unexpected_response",
    );
    expect(
      apiErrorFromBody(400, { error: { code: "malformed_json", message: "Bad", details: [1] } }).details,
    ).toEqual([]);
  });
});

describe("describeApiError", () => {
  it("gives conflicts and missing records their own message", () => {
    const conflict = new ApiError("run_in_progress", 409, "A search for this config is already running.");
    expect(describeApiError(conflict)).toMatch(/already running/);
    expect(describeApiError(new ApiError("run_not_cancellable", 409, "x"))).toMatch(/nothing to cancel/);
    expect(describeApiError(new ApiError("not_found", 404, "x"), "lead")).toBe("This lead no longer exists.");
    expect(describeApiError(new Error("boom"))).toMatch(/Reload the page/);
  });
});
