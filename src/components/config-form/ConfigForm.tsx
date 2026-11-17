"use client";

import Link from "next/link";
import { useCallback } from "react";
import { api } from "@/api-client/api";
import { ApiError } from "@/api-client/api-error";
import type { SearchConfig, SearchType } from "@/api-client/types";
import { useResource } from "@/api-client/use-resource";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/ui/states";
import { ConfigEditor } from "./ConfigEditor";

function ReadyEditor({ types, config }: { types: readonly SearchType[]; config: SearchConfig | null }) {
  const [first, ...rest] = types;
  if (!first) {
    return (
      <Notice tone="error">
        <p>The server has no search types registered, so there is nothing to configure.</p>
      </Notice>
    );
  }
  return <ConfigEditor types={[first, ...rest]} config={config} />;
}

export function ConfigForm({ configId }: { configId?: string }) {
  const load = useCallback(
    () => Promise.all([api.searchTypes(), configId ? api.configs.get(configId) : Promise.resolve(null)]),
    [configId],
  );
  const { resource, reload } = useResource(load);
  const title = configId ? "Edit search config" : "New search config";

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <Link href="/" className="back-link">
            Search configs
          </Link>
          <h1 className="page-title">{title}</h1>
        </div>
      </div>
      {resource.status === "loading" ? <LoadingRows rows={4} label="Loading the form" /> : null}
      {resource.status === "error" ? (
        resource.error instanceof ApiError && resource.error.code === "not_found" ? (
          <EmptyState
            title="This config no longer exists"
            action={
              <Link href="/" className="button">
                Back to search configs
              </Link>
            }
          >
            It may have been deleted in another tab. Nothing was changed.
          </EmptyState>
        ) : (
          <ErrorState error={resource.error} onRetry={reload} />
        )
      ) : null}
      {resource.status === "ready" ? (
        <ReadyEditor types={resource.data[0]} config={resource.data[1]} />
      ) : null}
    </div>
  );
}
