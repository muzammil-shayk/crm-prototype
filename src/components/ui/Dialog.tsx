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
  returnFocus?: () => HTMLElement | null;
  children: ReactNode;
}

export function Dialog({
  open,
  onClose,
  title,
  variant = "center",
  footer,
  returnFocus,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const headRef = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const focusBack = useRef(returnFocus);
  const titleId = useId();

  useEffect(() => {
    focusBack.current = returnFocus;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      if (dialog.open) return;
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      return;
    }
    if (dialog.open) dialog.close();
    const target = focusBack.current?.() ?? opener.current;
    opener.current = null;
    if (target?.isConnected) target.focus();
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
          <header ref={headRef} className={styles.dialogHead}>
            <h2 id={titleId} className={styles.dialogTitle}>
              {title}
            </h2>
            <button type="button" className={styles.dialogClose} aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </button>
          </header>
          <div
            className={styles.dialogBody}
            onScroll={(event) => {
              headRef.current?.toggleAttribute("data-scrolled", event.currentTarget.scrollTop > 0);
            }}
          >
            {children}
          </div>
          {footer ? <footer className={styles.dialogFoot}>{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  );
}
