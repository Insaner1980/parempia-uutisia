"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { CATEGORIES } from "@/lib/domain";
import styles from "./Header.module.css";

const mainLinks = [
  { href: "/", label: "Etusivu" },
  { href: "/suomi", label: "Suomi" },
  { href: "/maailmalta", label: "Maailmalta" },
  ...CATEGORIES.slice(0, 3).map((category) => ({ href: `/aihe/${category.slug}`, label: category.label })),
];
const moreLinks = [
  ...CATEGORIES.slice(3).map((category) => ({ href: `/aihe/${category.slug}`, label: category.label })),
  { href: "/uusimmat", label: "Uusimmat" },
  { href: "/lahteet", label: "Lähteet" },
  { href: "/miten-tama-toimii", label: "Miten tämä toimii" },
  { href: "/tietoa", label: "Tietoa meistä" },
];

export function Navigation() {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const details = useRef<HTMLDetailsElement>(null);
  const isOpen = openPath === pathname;
  const close = () => {
    setOpenPath(null);
    if (details.current) details.current.open = false;
  };
  const link = ({ href, label }: { href: string; label: string }) => <Link
    key={href} href={href} onClick={close} aria-current={pathname === href ? "page" : undefined}
  >{label}</Link>;

  return <div className={styles.navigationArea} onKeyDown={(event) => {
    if (event.key === "Escape") {
      if (isOpen) { close(); menuButton.current?.focus(); }
      else if (details.current?.open) { details.current.open = false; details.current.querySelector("summary")?.focus(); }
    }
  }}>
    <button ref={menuButton} type="button" className={styles.menuButton} aria-expanded={isOpen} aria-controls="main-navigation" onClick={() => setOpenPath(isOpen ? null : pathname)}>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d={isOpen ? "M4 4l12 12M16 4L4 16" : "M2 5h16M2 10h16M2 15h16"} /></svg>
      Valikko
    </button>
    <nav id="main-navigation" aria-label="Päävalikko" className={`${styles.navigation} ${isOpen ? styles.navigationOpen : ""}`}>
      {mainLinks.map(link)}
      <details ref={details} className={styles.more}>
        <summary>Lisää <span aria-hidden="true">+</span></summary>
        <div className={styles.moreLinks}>{moreLinks.map(link)}</div>
      </details>
      <div className={styles.mobileMore}>{moreLinks.map(link)}</div>
    </nav>
  </div>;
}
