import { ArticleList, PageHeading, resultCount } from "@/components/ArticleList";
import { SearchForm } from "@/components/SearchForm";
import { getArticles, getSources } from "@/server/queries";
import { metadataFor } from "@/lib/metadata";
import { normalizePublicText } from "@/lib/text";
import styles from "@/components/Search.module.css";

export function generateMetadata() {
  return { ...metadataFor("Haku", "Etsi uutisia aiheen, alueen, lähteen ja ajankohdan mukaan.", "/haku"), robots: { index: false, follow: true } };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const input = await searchParams;
  const params: Record<string, string> = {};
  for (const key of ["q", "region", "category", "source", "period", "sort", "page"]) {
    const value = input[key];
    if (typeof value === "string") params[key] = normalizePublicText(value).slice(0, 160);
  }
  const data = getArticles(params);
  return <>
    <PageHeading title="Hae uutisia" description="Etsi aihetta, tapahtumaa tai lähdettä. Voit rajata hakua myös ilman hakusanaa." />
    <SearchForm params={params} sources={getSources()} />
    <div className={styles.results} aria-live="polite"><h2>Hakutulokset</h2><p>{resultCount(data.total)}</p></div>
    <ArticleList data={data} path="/haku" params={params} search />
  </>;
}
