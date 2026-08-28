import Link from "next/link";
import { PUBLIC_TIME_ZONE } from "@/lib/dates";
import { Navigation } from "./Navigation";
import { ThemeControl } from "./ThemeControl";
import styles from "./Header.module.css";

export function Header() {
  const date = new Intl.DateTimeFormat("fi-FI", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: PUBLIC_TIME_ZONE }).format(new Date());
  return <header className={styles.header}>
    <div className={styles.utility}>
      <time dateTime={new Date().toISOString()} className={styles.date}>{date}</time>
      <span className={styles.edition}>Suomesta ja maailmalta</span>
      <div className={styles.tools}>
        <Link href="/haku" className={styles.search}>
          <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.7" /><path d="m13 13 4.5 4.5" /></svg>
          Haku
        </Link>
        <ThemeControl />
      </div>
    </div>
    <Link href="/" className={styles.masthead} aria-label="Parempia Uutisia, etusivu">Parempia Uutisia</Link>
    <p className={styles.descriptor}>Pieniä ja suuria syitä iloon.</p>
    <Navigation />
  </header>;
}
