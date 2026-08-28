import Link from "next/link";
import { notFound } from "next/navigation";
import { ApprovedImage } from "@/components/ApprovedImage";
import { SourceLink, StoryMeta } from "@/components/Story";
import { getArticleBySlug } from "@/server/queries";
import { getCategory, SOURCE_TYPE_LABELS } from "@/lib/domain";
import { metadataFor, siteBase } from "@/lib/metadata";
import { normalizePublicText } from "@/lib/text";
import styles from "@/components/Article.module.css";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();
  return { ...metadataFor(article.titleFi, article.summaryFi, `/uutinen/${slug}`), ...(article.isFixture ? { robots: { index: false, follow: false } } : {}) };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();
  const category = getCategory(article.primaryCategory)!;
  const structuredData = {
    "@context": "https://schema.org", "@type": "Article", inLanguage: "fi",
    headline: normalizePublicText(article.titleFi), description: normalizePublicText(article.summaryFi),
    url: new URL(`/uutinen/${article.slug}`, siteBase()).href, datePublished: article.publishedAt,
    publisher: { "@type": "Organization", name: "Parempia Uutisia" },
    isBasedOn: { "@type": "CreativeWork", url: article.canonicalUrl, datePublished: article.sourcePublishedAt, publisher: { "@type": "Organization", name: normalizePublicText(article.source.name) } },
    genre: "Uutistiivistelmä",
  };
  return <article className={styles.article} data-article-id={article.id}>
    {!article.isFixture && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />}
    <div className={styles.kicker}>
      <Link href={`/aihe/${category.slug}`}>{category.label}</Link>
      <Link href={article.region === "Suomi" ? "/suomi" : "/maailmalta"}>{article.region}</Link>
      <span>Uutistiivistelmä</span>
    </div>
    <h1>{normalizePublicText(article.titleFi)}</h1>
    <div className={styles.byline}><StoryMeta article={article} /><span className={styles.sourceType}>{SOURCE_TYPE_LABELS[article.source.sourceType]}</span></div>
    {article.image && <ApprovedImage image={article.image} priority />}
    <div className={styles.body}>
      <p className={styles.summary}>{normalizePublicText(article.summaryFi)}</p>
      {article.isFixture ? <p className={styles.transparency}>Tämä on kehitysesimerkki, ei automaattisesti julkaistu ajankohtainen uutinen. {article.source.id.startsWith("demo-nasa") ? "Tiivistelmä pohjautuu alla olevaan NASAn uutiseen." : "Tapahtuma ja lähde ovat kuvitteellisia. Lähdelinkki vie testikäyttöön varatulle example.org-sivulle."}</p> : <p className={styles.transparency}>Tiivistelmä on tuotettu automaattisesti alkuperäisen lähteen perusteella. Se ei korvaa alkuperäistä uutista. <Link href="/miten-tama-toimii">Miten uutiset valitaan</Link></p>}
      {article.source.contentLicense && article.source.contentLicenseUrl && <p className={styles.transparency}>Lähdeteksti: {normalizePublicText(article.source.name)}. <a href={article.source.contentLicenseUrl} rel="external noopener noreferrer">{normalizePublicText(article.source.contentLicense)}</a>. Tekstistä on laadittu lyhyt suomenkielinen tiivistelmä.</p>}
      <SourceLink article={article} prominent />
      <div className={styles.back}><Link href={`/aihe/${category.slug}`} className="text-link">← Kaikki aiheen uutiset: {category.label}</Link></div>
    </div>
  </article>;
}
