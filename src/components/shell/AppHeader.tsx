"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
