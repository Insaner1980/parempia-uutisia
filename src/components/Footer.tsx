import Link from "next/link";
import styles from "./Footer.module.css";

export function Footer() {
  return <footer className={styles.footer}>
    <div className={styles.inner}>
      <div>
        <Link href="/" className={styles.wordmark}>Parempia Uutisia</Link>
        <p>Maailmassa tapahtuu myös hyvää.</p>
      </div>
      <nav aria-label="Tietoa palvelusta" className={styles.links}>
        <Link href="/tietoa">Tietoa meistä</Link>
        <Link href="/miten-tama-toimii">Miten tämä toimii</Link>
        <Link href="/lahteet">Lähteet</Link>
        <Link href="/tietosuoja">Tietosuoja</Link>
      </nav>
    </div>
    <div className={styles.bottom}>
      <span>Lyhyet tiivistelmät. Alkuperäiset lähteet.</span>
      <span>Suomenkielinen uutiskooste</span>
    </div>
  </footer>;
}
