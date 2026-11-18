import { useEffect } from "react";
import type { LeadPage } from "./group-leads";
import styles from "./leads.module.css";

const TYPING = "input:not([type=radio]):not([type=checkbox]), textarea, select, [contenteditable]";

export function useLeadKeys(page: LeadPage | undefined, onGo: ((leadId: string) => void) | undefined) {
  useEffect(() => {
    if (!page || !onGo) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return;
      if (event.target instanceof Element && event.target.closest(TYPING)) return;
      const target = event.key === "j" ? page.next : event.key === "k" ? page.previous : null;
      if (!target) return;
      event.preventDefault();
      onGo(target);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [page, onGo]);
}

export function LeadPager({ page, onGo }: { page: LeadPage; onGo: (leadId: string) => void }) {
  const step = (target: string | null) => () => {
    if (target) onGo(target);
  };
  return (
    <nav className={styles.pager} aria-label="Leads in this run">
      <button
        type="button"
        className="button button-quiet"
        aria-disabled={!page.previous || undefined}
        aria-keyshortcuts="K"
        onClick={step(page.previous)}
      >
        <kbd className={styles.key}>K</kbd> Previous
      </button>
      <p className={`${styles.pagerPosition} mono`} aria-live="polite">
        {page.position > 0 ? `${page.position} of ${page.total}` : `${page.total} shown`}
      </p>
      <button
        type="button"
        className="button button-quiet"
        aria-disabled={!page.next || undefined}
        aria-keyshortcuts="J"
        onClick={step(page.next)}
      >
        Next <kbd className={styles.key}>J</kbd>
      </button>
    </nav>
  );
}
