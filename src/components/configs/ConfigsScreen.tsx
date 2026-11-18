"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/api-client/api";
import { describeApiError } from "@/api-client/api-error";
import type { SearchConfig } from "@/api-client/types";
import { useResource } from "@/api-client/use-resource";
import { searchUrl, startOrResumeSearch } from "@/components/search/start-search";
import { PlusIcon } from "@/components/ui/icons";
import { ErrorState, LoadingRows, Notice } from "@/components/ui/states";
import { ConfigFilters } from "./ConfigFilters";
import { ConfigList, configLinkId } from "./ConfigList";
import { DeleteConfigDialog } from "./DeleteConfigDialog";
import { filterConfigs, focusAfterRemoval, NO_FILTER, type ConfigFilter } from "./filter-configs";

export function ConfigsScreen() {
  const router = useRouter();
  const configs = useResource(api.configs.list);
  const types = useResource(api.searchTypes);
  const [filter, setFilter] = useState<ConfigFilter>(NO_FILTER);
  const [deleting, setDeleting] = useState<SearchConfig | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<{ id: string | null } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!focusTarget) return;
    const link = focusTarget.id ? document.getElementById(configLinkId(focusTarget.id)) : null;
    (link ?? headingRef.current)?.focus();
  }, [focusTarget]);

  const typeList = types.resource.status === "ready" ? types.resource.data : [];

  const act = async (config: SearchConfig, action: () => Promise<void>) => {
    if (busyId !== null) return;
    setBusyId(config.id);
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(describeApiError(error));
    } finally {
      setBusyId(null);
    }
  };

  const run = (config: SearchConfig) =>
    act(config, async () => {
      const started = await startOrResumeSearch(config.id);
      router.push(searchUrl(config.id, started.id));
    });

  const duplicate = (config: SearchConfig) =>
    act(config, async () => {
      const copy = await api.configs.duplicate(config.id);
      configs.update((list) => [copy, ...list]);
    });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 ref={headingRef} className="page-title" tabIndex={-1}>
            Search configs
          </h1>
          <p className="page-lede">
            Each config describes the leads you want. Run one to fetch and score fresh posts.
          </p>
        </div>
        <Link href="/configs/new" className="button button-primary button-large">
          <PlusIcon />
          New config
        </Link>
      </div>

      {actionError ? (
        <Notice tone="error" live>
          <p>{actionError}</p>
        </Notice>
      ) : null}

      {configs.resource.status === "loading" ? <LoadingRows rows={3} label="Loading search configs" /> : null}
      {configs.resource.status === "error" ? (
        <ErrorState error={configs.resource.error} onRetry={configs.reload} />
      ) : null}
      {configs.resource.status === "ready" ? (
        <>
          {configs.resource.data.length > 0 ? (
            <ConfigFilters filter={filter} types={typeList} onChange={setFilter} />
          ) : null}
          <ConfigList
            configs={configs.resource.data}
            types={typeList}
            filter={filter}
            busyId={busyId}
            onClearFilter={() => {
              setFilter(NO_FILTER);
            }}
            onRun={(config) => void run(config)}
            onDuplicate={(config) => void duplicate(config)}
            onDelete={setDeleting}
          />
        </>
      ) : null}

      <DeleteConfigDialog
        config={deleting}
        onClose={() => {
          setDeleting(null);
        }}
        onDeleted={(id) => {
          if (configs.resource.status === "ready") {
            const visible = filterConfigs(configs.resource.data, filter).map((config) => config.id);
            setFocusTarget({ id: focusAfterRemoval(visible, id) });
          }
          configs.update((list) => list.filter((config) => config.id !== id));
          setDeleting(null);
        }}
      />
    </div>
  );
}
