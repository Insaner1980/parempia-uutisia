import Link from "next/link";
import type { ArticlePage } from "@/lib/domain";
import { Story } from "./Story";
import styles from "./Editorial.module.css";

export function resultCount(count: number): string { return `${count} ${count === 1 ? "uutinen" : "uutista"}`; }

export function EmptyState({ search = false }: { search?: boolean }) {
  return <div className={styles.empty}>
    <h2>{search ? "Näillä rajauksilla ei löytynyt uutisia" : "Täällä ei ole vielä julkaistuja uutisia"}</h2>
    <p>{search ? "Kokeile toista hakusanaa tai poista jokin rajaus. Voit myös palata kaikkien uutisten pariin." : "Julkaisemme uutisen vasta, kun lähde ja tiivistelmä täyttävät valintaperusteet. Sillä välin voit lukea, miten uutiset valitaan."}</p>
    <div className={styles.emptyLinks}>
      <Link href={search ? "/haku" : "/miten-tama-toimii"} className="text-link">{search ? "Tyhjennä rajaukset" : "Miten uutiset valitaan"}</Link>
      <Link href="/uusimmat" className="text-link">Kaikki uutiset</Link>
    </div>
  </div>;
}

export function Pagination({ data, path, params = {} }: { data: ArticlePage; path: string; params?: Record<string, string> }) {
  const pages = Math.ceil(data.total / data.pageSize);
  if (pages <= 1) return null;
  const href = (page: number) => {
    const query = new URLSearchParams(params);
    if (page > 1) query.set("page", String(page)); else query.delete("page");
    return query.size ? `${path}?${query}` : path;
  };
  return <nav aria-label="Uutisten sivut" className={styles.pagination}>
    {data.page > 1 ? <Link href={href(data.page - 1)}>← Edellinen sivu</Link> : <span />}
    <span>Sivu {data.page} / {pages}</span>
    {data.page < pages ? <Link href={href(data.page + 1)}>Seuraava sivu →</Link> : <span />}
  </nav>;
}

export function ArticleList({ data, path, params, search = false }: { data: ArticlePage; path: string; params?: Record<string, string>; search?: boolean }) {
  return <>
    {data.items.length ? <div className={styles.listing}>{data.items.map((article) => <Story key={article.id} article={article} headingLevel={2} />)}</div> : <EmptyState search={search} />}
    <Pagination data={data} path={path} params={params} />
  </>;
}

export function PageHeading({ title, description, count }: { title: string; description: string; count?: number }) {
  return <div className={styles.pageHeading}>
    <div><h1>{title}</h1><p>{description}</p></div>
    {count !== undefined && <span className={styles.count}>{resultCount(count)}</span>}
  </div>;
}
