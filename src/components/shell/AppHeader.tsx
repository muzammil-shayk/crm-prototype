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
          Lead CRM
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
      </div>
    </header>
  );
}
