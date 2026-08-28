import Link from "next/link";
import { Story } from "@/components/Story";
import { EmptyState } from "@/components/ArticleList";
import { getHomeArticles } from "@/server/queries";
import { selectFrontPage } from "@/lib/selection";
import { metadataFor, SITE_DESCRIPTION } from "@/lib/metadata";
import type { Article } from "@/lib/domain";
import styles from "@/components/Editorial.module.css";

export function generateMetadata() { return metadataFor("Hyviä uutisia Suomesta ja maailmalta", SITE_DESCRIPTION, "/"); }

function NewsSection({ title, href, linkLabel, items, compact = false }: { title: string; href: string; linkLabel: string; items: Article[]; compact?: boolean }) {
  if (!items.length) return null;
  return <section className={styles.section} aria-label={title}>
    <div className={styles.sectionHeading}><h2>{title}</h2><Link href={href}>{linkLabel} <span aria-hidden="true"> →</span></Link></div>
    <div className={compact ? styles.latestGrid : styles.storyGrid}>
      {items.map((article) => <Story key={article.id} article={article} variant={compact ? "compact" : "standard"} />)}
    </div>
  </section>;
}

export default function HomePage() {
  const front = selectFrontPage(getHomeArticles());
  return <>
    <h1 className="sr-only">Hyviä uutisia Suomesta ja maailmalta</h1>
    <div className={styles.frontIntro}><p className={styles.eyebrow}>Uutisvirrasta poimittua</p><Link className={styles.introLink} href="/uusimmat">Kaikki uutiset <span aria-hidden="true"> →</span></Link></div>
    {front.lead ? <section aria-label="Pääuutiset" className={`${styles.leadGroup} ${front.secondary.length === 0 ? styles.singleLead : front.secondary.length === 1 ? styles.twoLeads : ""}`}>
      <div className={styles.leadPrimary}><Story article={front.lead} variant="lead" headingLevel={2} priority /></div>
      {front.secondary[0] && <div className={styles.secondaryFeature}><Story article={front.secondary[0]} headingLevel={2} priority /></div>}
      {front.secondary.length > 1 && <div className={styles.secondaryList}>{front.secondary.slice(1).map((article) => <Story key={article.id} article={article} headingLevel={2} variant="compact" />)}</div>}
    </section> : <EmptyState />}
    <NewsSection title="Suomesta" href="/suomi" linkLabel="Kaikki Suomen uutiset" items={front.suomi} />
    <NewsSection title="Maailmalta" href="/maailmalta" linkLabel="Kaikki maailman uutiset" items={front.maailmalta} />
    <NewsSection title="Eläimet" href="/aihe/elaimet" linkLabel="Kaikki eläinuutiset" items={front.animals} />
    <NewsSection title="Uusimmat" href="/uusimmat" linkLabel="Koko uutisvirta" items={front.latest} compact />
  </>;
}
