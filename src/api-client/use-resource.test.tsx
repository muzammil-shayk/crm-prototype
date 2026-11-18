// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useResource } from "./use-resource";

afterEach(cleanup);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe("useResource with server data", () => {
  it("shows the server data at once, then replaces it with a fresh load", async () => {
    const fresh = deferred<string[]>();
    const load = vi.fn(() => fresh.promise);
    const { result } = renderHook(() => useResource(load, ["stale"]));

    expect(result.current.resource).toEqual({ status: "ready", data: ["stale"] });
    expect(load).toHaveBeenCalledTimes(1);

    await act(async () => {
      fresh.resolve(["fresh"]);
      await fresh.promise;
    });
    expect(result.current.resource).toEqual({ status: "ready", data: ["fresh"] });
  });

  it("keeps the server data when the quiet refresh fails", async () => {
    const failed = deferred<string[]>();
    const { result } = renderHook(() => useResource(() => failed.promise, ["stale"]));

    await act(async () => {
      failed.reject(new Error("offline"));
      await failed.promise.catch(() => undefined);
    });
    expect(result.current.resource).toEqual({ status: "ready", data: ["stale"] });
  });

  it("reports a failed reload even after server data", async () => {
    const calls = [deferred<string[]>(), deferred<string[]>()];
    let call = 0;
    const load = () => calls[call++]?.promise ?? Promise.reject(new Error("unexpected"));
    const { result } = renderHook(() => useResource(load, ["stale"]));

    await act(async () => {
      calls[0]?.resolve(["fresh"]);
      await calls[0]?.promise;
    });
    act(() => {
      result.current.reload();
    });
    expect(result.current.resource).toEqual({ status: "loading" });

    const error = new Error("offline");
    await act(async () => {
      calls[1]?.reject(error);
      await calls[1]?.promise.catch(() => undefined);
    });
    expect(result.current.resource).toEqual({ status: "error", error });
  });
});
