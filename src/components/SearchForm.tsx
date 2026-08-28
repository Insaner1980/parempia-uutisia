import Form from "next/form";
import Link from "next/link";
import { CATEGORIES, type SourceRecord } from "@/lib/domain";
import { normalizePublicText } from "@/lib/text";
import styles from "./Search.module.css";

export function SearchForm({ params, sources }: { params: Record<string, string>; sources: SourceRecord[] }) {
  return <Form action="/haku" className={styles.form} key={new URLSearchParams(params).toString()}>
    <div className={styles.searchRow}>
      <label className={styles.query}>Hakusana<input type="search" name="q" defaultValue={params.q || ""} maxLength={160} placeholder="Esimerkiksi kirjasto tai luonnonsuojelu" /></label>
      <button type="submit" className="button">Hae</button>
    </div>
    <div className={styles.filters}>
      <label>Alue<select name="region" defaultValue={params.region || ""}><option value="">Kaikki</option><option value="Suomi">Suomi</option><option value="Maailmalta">Maailmalta</option></select></label>
      <label>Aihe<select name="category" defaultValue={params.category || ""}><option value="">Kaikki aiheet</option>{CATEGORIES.map((category) => <option key={category.slug} value={category.slug}>{category.label}</option>)}</select></label>
      <label>Lähde<select name="source" defaultValue={params.source || ""}><option value="">Kaikki lähteet</option>{sources.map((source) => <option key={source.id} value={source.id}>{normalizePublicText(source.name)}</option>)}</select></label>
      <label>Ajankohta<select name="period" defaultValue={params.period || "all"}><option value="all">Kaikki</option><option value="today">Tänään</option><option value="7">Viimeiset 7 päivää</option><option value="30">Viimeiset 30 päivää</option></select></label>
      <label>Järjestys<select name="sort" defaultValue={params.sort || "newest"}><option value="newest">Uusimmat ensin</option><option value="oldest">Vanhimmat ensin</option></select></label>
    </div>
    <Link href="/haku" className={styles.clear}>Tyhjennä rajaukset</Link>
  </Form>;
}
