import { vi } from "vitest";

type Reply = { status?: number; body?: unknown };
type Route = (url: URL, init: RequestInit | undefined) => Reply;

export function stubFetch(route: Route) {
  const calls: { method: string; path: string }[] = [];
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, "http://localhost");
    calls.push({ method: init?.method ?? "GET", path: url.pathname + url.search });
    const { status = 200, body } = route(url, init);
    return Promise.resolve(
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return {
    calls,
    count: (method: string, path: string) =>
      calls.filter((call) => call.method === method && call.path === path).length,
  };
}
