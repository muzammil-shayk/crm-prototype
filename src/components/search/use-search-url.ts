"use client";

import { useEffect, useRef } from "react";
import type { Wanted } from "./select-search";

export function useSearchUrl(ready: boolean, url: string, restore: (wanted: Wanted) => void) {
  const pushNext = useRef(false);

  useEffect(() => {
    const push = pushNext.current;
    pushNext.current = false;
    if (!ready || window.location.pathname + window.location.search === url) return;
    if (push) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, [ready, url]);

  useEffect(() => {
    const onPop = () => {
      const params = new URLSearchParams(window.location.search);
      restore({ configId: params.get("config"), runId: params.get("run") });
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
    };
  }, [restore]);

  return () => {
    pushNext.current = true;
  };
}
