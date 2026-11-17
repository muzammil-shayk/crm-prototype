import { ApiError, apiErrorFromBody } from "./api-error";

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

async function readBody(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

async function send(path: string, { method = "GET", body, signal }: RequestOptions): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      signal,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError("network_error", 0, "The request did not reach the server.");
  }
  if (!response.ok) throw apiErrorFromBody(response.status, await readBody(response));
  return response;
}

export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const body = await readBody(await send(path, options));
  if (body === undefined) {
    throw new ApiError("unexpected_response", 200, "The server answered without a JSON body.");
  }
  return body as T;
}

export async function requestNoContent(path: string, options: RequestOptions = {}): Promise<void> {
  await send(path, options);
}
