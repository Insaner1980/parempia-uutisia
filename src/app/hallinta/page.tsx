import { cookies } from "next/headers";
import { PageHeading } from "@/components/ArticleList";
import { AdminAction } from "@/components/AdminAction";
import { ADMIN_COOKIE_NAME, isAdminConfigured, verifyAdminToken } from "@/server/auth";
import { getAdminOverview } from "@/server/queries";
import { formatFinnishDateTime } from "@/lib/dates";
import { normalizePublicText } from "@/lib/text";
import { metadataFor } from "@/lib/metadata";
import styles from "@/components/Admin.module.css";

export function generateMetadata() { return { ...metadataFor("Hallinta", "Uutishakujen ja lähteiden hallinta.", "/hallinta"), robots: { index: false, follow: false } }; }

const statusLabels: Record<string, string> = { published: "Julkaistu", pending: "Odottaa käsittelyä", rejected: "Hylätty", withdrawn: "Poistettu julkaisusta", running: "Käynnissä", completed: "Valmis", partial: "Osittain valmis", failed: "Epäonnistui", locked: "Toinen ajo käynnissä" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ virhe?: string }> }) {
  const { virhe } = await searchParams;
  if (!isAdminConfigured()) return <><PageHeading title="Hallinta ei ole käytössä" description="Ylläpitoavain on määritettävä palvelimen ympäristöasetuksiin ennen kirjautumista." /><p className={styles.help}>Aseta vähintään 32 merkkiä pitkä ADMIN_SECRET-arvo ja käynnistä palvelin uudelleen. Avainta ei lähetetä julkisille sivuille.</p></>;
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!verifyAdminToken(token)) return <>
    <PageHeading title="Hallinta" description="Kirjaudu uutishakujen ja lähteiden hallintaan." />
    <form className={styles.login} action="/api/hallinta/login" method="post">
      {virhe && <p role="alert">{virhe === "raja" ? "Liian monta yritystä. Odota minuutti ja yritä uudelleen." : "Kirjautuminen ei onnistunut. Tarkista hallinnan avain."}</p>}
      <label>Hallinnan avain<input type="password" name="secret" autoComplete="current-password" required maxLength={1024} /></label>
      <button className="button" type="submit">Kirjaudu</button>
      <p className={styles.help}>Avain on palvelimen ADMIN_SECRET-asetuksessa. Hallinta ei ole uutisten kirjoitustyökalu.</p>
    </form>
  </>;
  const data = getAdminOverview();
  const demo = process.env.DEMO_MODE === "true";
  const sources = data.sources.filter((source) => !source.id.startsWith("demo-"));
  const counts = [
    ["Julkaistu", data.counts.published], ["Odottaa", data.counts.pending], ["Hylätty", data.counts.rejected],
    ["Yhdistetty", data.counts.duplicates], ["Virheitä ajoissa", data.counts.failed], ["Poistettu", data.counts.withdrawn],
  ];
  return <>
    <div className={styles.top}><PageHeading title="Hallinta" description="Uutisputken tila ja käytössä olevat lähteet." /><form action="/api/hallinta/logout" method="post"><button className="button button-secondary">Kirjaudu ulos</button></form></div>
    <p className={styles.help}>{demo ? "Esittelytila käyttää erillistä kehitystietokantaa. Esimerkkiajo käsittelee vain valmista kehitysaineistoa eikä kutsu oikeaa AI-palvelua." : "Uutishaku hakee hyväksytyt lähteet ja julkaisee vain valintaperusteet läpäisseet tiivistelmät. Epävarmoja uutisia ei tarvitse hyväksyä käsin."}</p>
    {!demo && !process.env.DEEPSEEK_API_KEY && <p className="status-message">AI-palvelun avain puuttuu. Lähteet voidaan hakea, mutta uusia uutisia ei julkaista automaattisesti.</p>}
    <AdminAction action="ingest" label={demo ? "Suorita esimerkkiajo" : "Käynnistä uutishaku"} pendingLabel="Uutishaku käynnissä" primary />
    <dl className={styles.counts}>{counts.map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}</dl>
    <section className={styles.section}><h2>Uutislähteet</h2>{sources.map((source) => <div key={source.id} className={styles.source}>
      <div><h3>{normalizePublicText(source.name)}</h3><p>{source.enabled ? "Käytössä" : "Pois käytöstä"}</p></div>
      <div className={styles.sourceDetails}><p>Viimeisin onnistunut haku: {source.lastSuccessAt ? formatFinnishDateTime(source.lastSuccessAt) : "Ei hakuja"}</p><p>Pyyntöväli vähintään {source.rateLimitMs / 1000} sekuntia.</p>{source.lastError && <p>Virhe: {normalizePublicText(source.lastError)}</p>}</div>
      <AdminAction action="source" id={source.id} enabled={!source.enabled} label={source.enabled ? "Poista käytöstä" : "Ota käyttöön"} />
    </div>)}</section>
    <section className={styles.section}><h2>Viimeisimmät haut</h2>{!data.runs.length ? <p className={styles.help}>Hakuja ei ole vielä tehty.</p> : <div className={styles.runs}><table><caption className="sr-only">Uutishakujen tulokset</caption><thead><tr><th>Aloitettu</th><th>Tila</th><th>Haettu</th><th>Julkaistu</th><th>Hylätty</th><th>Yhdistetty</th><th>Virheitä</th><th>Yhteenveto</th></tr></thead><tbody>{data.runs.map((run) => <tr key={run.id}><td>{formatFinnishDateTime(run.startedAt)}</td><td>{statusLabels[run.status]}</td><td>{run.fetchedCount}</td><td>{run.publishedCount}</td><td>{run.rejectedCount}</td><td>{run.duplicateCount}</td><td>{run.errorCount}</td><td>{normalizePublicText(run.logSummary)}</td></tr>)}</tbody></table></div>}</section>
    <section className={styles.section}><h2>Viimeksi käsitellyt uutiset</h2><p className={styles.help}>Tarvittaessa voit poistaa selvästi virheellisen tiivistelmän julkaisusta. Poistettua uutista ei julkaista seuraavassa haussa uudelleen.</p>{data.articles.map((article) => <div key={article.id} className={styles.item}>
      <div><h3>{normalizePublicText(article.titleFi || article.originalTitle)}</h3><p>{normalizePublicText(article.sourceName)}, {statusLabels[article.status]}</p><p>{normalizePublicText(article.decisionReason)}</p></div>
      {article.status === "published" && <AdminAction action="withdraw" id={article.id} label="Poista julkaisusta" confirm="Poistetaanko tämä uutinen julkisilta sivuilta?" />}
    </div>)}</section>
  </>;
}
