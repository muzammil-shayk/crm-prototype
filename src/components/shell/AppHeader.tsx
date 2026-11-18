"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import styles from "./shell.module.css";

const LINKS = [
  {
    href: "/",
    label: "Search configs",
    matches: (path: string) => path === "/" || path.startsWith("/configs"),
  },
  { href: "/search", label: "Live search", matches: (path: string) => path.startsWith("/search") },
];

export function AppHeader() {
  const pathname = usePathname();
  const previousPath = useRef(pathname);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    const lost = document.activeElement === null || document.activeElement === document.body;
    if (lost) document.getElementById("main")?.focus();
  }, [pathname]);

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link href="/" className={styles.wordmark}>
          <svg className={styles.mark} viewBox="0 0 22 20" aria-hidden="true">
            <rect x="0" width="3" height="20" />
            <rect x="4.75" width="3" height="15" />
            <rect x="9.5" width="3" height="11.5" />
            <rect x="14.25" width="3" height="8.5" />
            <rect x="19" width="3" height="4" className={styles.markStrong} />
            <rect x="19" y="5" width="3" height="2.5" className={styles.markMedium} />
            <rect x="19" y="8.5" width="3" height="1.5" className={styles.markWeak} />
          </svg>
          <span className={styles.wordLead}>Lead</span>
          <span className={styles.wordCrm}>CRM</span>
        </Link>
        <nav aria-label="Main">
          <ul className={styles.nav}>
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={styles.navLink}
                  aria-current={link.matches(pathname) ? "page" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className={`${styles.mode} mono`}>Mock providers · offline</p>
      </div>
    </header>
  );
}
