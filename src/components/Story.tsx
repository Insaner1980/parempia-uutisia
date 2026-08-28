import Link from "next/link";
import type { Article } from "@/lib/domain";
import { getCategory } from "@/lib/domain";
import { formatFinnishDate } from "@/lib/dates";
import { normalizePublicText } from "@/lib/text";
import { ApprovedImage } from "./ApprovedImage";
import styles from "./Story.module.css";

export function SourceLink({ article, prominent = false }: { article: Article; prominent?: boolean }) {
  return <a href={article.canonicalUrl} rel="external noopener noreferrer" className={prominent ? "button" : styles.sourceLink}>
    Lue alkuperäinen uutinen <span aria-hidden="true">↗</span>
  </a>;
}

export function StoryMeta({ article }: { article: Article }) {
  return <div className={styles.meta}>
    <span>{normalizePublicText(article.source.name)}</span>
    <time dateTime={article.sourcePublishedAt}>{formatFinnishDate(article.sourcePublishedAt)}</time>
  </div>;
}

export function Story({ article, variant = "standard", headingLevel = 3, showImage = true, priority = false }: {
  article: Article; variant?: "lead" | "standard" | "compact"; headingLevel?: 2 | 3; showImage?: boolean; priority?: boolean;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return <article data-article-id={article.id} className={`${styles.story} ${styles[variant]}`}>
    {showImage && variant !== "compact" && article.image && <ApprovedImage image={article.image} priority={priority} compact />}
    <div className={styles.kicker}>
      <Link href={`/aihe/${article.primaryCategory}`}>{getCategory(article.primaryCategory)?.label}</Link>
      <span>{article.region}</span>
    </div>
    <Heading className={styles.headline}><Link href={`/uutinen/${article.slug}`}>{normalizePublicText(article.titleFi)}</Link></Heading>
    {variant !== "compact" && <p className={styles.summary}>{normalizePublicText(article.summaryFi)}</p>}
    <StoryMeta article={article} />
    {variant !== "compact" && <SourceLink article={article} />}
  </article>;
}
