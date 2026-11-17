"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { CloseIcon } from "./icons";
import styles from "./ui.module.css";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  variant?: "center" | "sheet";
  footer?: ReactNode;
  children: ReactNode;
}

export function Dialog({ open, onClose, title, variant = "center", footer, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      data-variant={variant}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open ? (
        <div className={styles.dialogFrame}>
          <header className={styles.dialogHead}>
            <h2 id={titleId} className={styles.dialogTitle}>
              {title}
            </h2>
            <button type="button" className={styles.dialogClose} aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </button>
          </header>
          <div className={styles.dialogBody}>{children}</div>
          {footer ? <footer className={styles.dialogFoot}>{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  );
}
