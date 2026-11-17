import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ConflictError, NotFoundError, ProviderError } from "./errors";
import { apiRoute, readJsonBody, toErrorResponse } from "./http";

async function bodyOf(response: Response) {
  return { status: response.status, body: (await response.json()) as unknown };
}

describe("toErrorResponse", () => {
  it("maps a Zod error to 400 with one detail per field", async () => {
    const schema = z.object({ name: z.string().min(1, "Give the search a name") });
    const failure = schema.safeParse({ name: "" }).error;

    expect(await bodyOf(toErrorResponse(failure))).toEqual({
      status: 400,
      body: {
        error: {
          code: "validation_failed",
          message: "The request has 1 invalid field.",
          details: [{ path: "name", message: "Give the search a name" }],
        },
      },
    });
  });

  it("maps a missing record to 404", async () => {
    expect(await bodyOf(toErrorResponse(new NotFoundError("Search config", "c1")))).toEqual({
      status: 404,
      body: { error: { code: "not_found", message: "Search config c1 was not found." } },
    });
  });

  it("maps a conflict to 409 with its own code", async () => {
    const error = new ConflictError("run_not_cancellable", "This run already finished.");
    expect(await bodyOf(toErrorResponse(error))).toEqual({
      status: 409,
      body: { error: { code: "run_not_cancellable", message: "This run already finished." } },
    });
  });

  it("maps a provider failure to 502", () => {
    const response = toErrorResponse(new ProviderError("search", "timed out after 5000 ms"));
    expect(response.status).toBe(502);
  });

  it("hides the details of an unexpected error behind a 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { status, body } = await bodyOf(toErrorResponse(new Error("SQLITE_BUSY at /Users/x/dev.db")));

    expect(status).toBe(500);
    expect(body).toEqual({ error: { code: "internal_error", message: "Something went wrong on our side." } });
  });
});

describe("unknown fields", () => {
  it("names each unknown field in the details", async () => {
    const schema = z.strictObject({ criteria: z.strictObject({ keywords: z.array(z.string()) }) });
    const failure = schema.safeParse({ criteria: { keywords: [], colour: "red" }, owner: "me" }).error;

    expect(await bodyOf(toErrorResponse(failure))).toEqual({
      status: 400,
      body: {
        error: {
          code: "validation_failed",
          message: "The request has 2 invalid fields.",
          details: [
            { path: "criteria.colour", message: "Unknown field" },
            { path: "owner", message: "Unknown field" },
          ],
        },
      },
    });
  });
});

describe("readJsonBody", () => {
  it("rejects a body over 1 MB with a 413", async () => {
    const request = new Request("http://test/api", {
      method: "POST",
      body: JSON.stringify({ description: "x".repeat(1024 * 1024) }),
    });
    const response = await apiRoute(async () => Response.json(await readJsonBody(request)))(request, {});

    expect(await bodyOf(response)).toEqual({
      status: 413,
      body: { error: { code: "validation_failed", message: "The request body is larger than 1 MB." } },
    });
  });

  it("rejects a body that is not JSON with a 400", async () => {
    const request = new Request("http://test/api", { method: "POST", body: "{name:" });
    const response = await apiRoute(async () => Response.json(await readJsonBody(request)))(request, {});

    expect(await bodyOf(response)).toEqual({
      status: 400,
      body: { error: { code: "malformed_json", message: "The request body is not valid JSON." } },
    });
  });

  it("returns the parsed body", async () => {
    const request = new Request("http://test/api", { method: "POST", body: '{"name":"Clinics"}' });
    expect(await readJsonBody(request)).toEqual({ name: "Clinics" });
  });
});
