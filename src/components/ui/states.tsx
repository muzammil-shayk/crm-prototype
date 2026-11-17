import type { ReactNode } from "react";
import { describeApiError, type ErrorSubject } from "@/api-client/api-error";
import styles from "./ui.module.css";

interface EmptyStateProps {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, children, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <h2 className={styles.emptyTitle}>{title}</h2>
      {children ? <div className={styles.emptyBody}>{children}</div> : null}
      {action ? <div className={styles.emptyAction}>{action}</div> : null}
    </div>
  );
}

interface ErrorStateProps {
  error: unknown;
  subject?: ErrorSubject;
  onRetry?: () => void;
}

export function ErrorState({ error, subject, onRetry }: ErrorStateProps) {
  return (
    <div className={styles.notice} data-tone="error" role="alert">
      <p>{describeApiError(error, subject)}</p>
      {onRetry ? (
        <button type="button" className="button" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

interface NoticeProps {
  tone: "error" | "warning" | "info" | "success";
  title?: string;
  children: ReactNode;
  live?: boolean;
}

export function Notice({ tone, title, children, live = false }: NoticeProps) {
  return (
    <div
      className={styles.notice}
      data-tone={tone}
      role={live ? (tone === "error" ? "alert" : "status") : undefined}
    >
      <div className={styles.noticeBody}>
        {title ? <p className={styles.noticeTitle}>{title}</p> : null}
        {children}
      </div>
    </div>
  );
}

export function LoadingRows({ rows = 3, label }: { rows?: number; label: string }) {
  return (
    <div className={styles.loading} role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={styles.skeletonRow}>
          <span className={styles.skeletonLine} />
          <span className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
        </div>
      ))}
    </div>
  );
}
