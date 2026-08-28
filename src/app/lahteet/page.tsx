import { PageHeading } from "@/components/ArticleList";
import { getSources } from "@/server/queries";
import { SOURCE_TYPE_LABELS } from "@/lib/domain";
import { formatFinnishDate } from "@/lib/dates";
import { metadataFor } from "@/lib/metadata";
import { normalizePublicText } from "@/lib/text";
import styles from "@/components/Information.module.css";

export function generateMetadata() { return metadataFor("Lähteet", "Käytössä olevat alkuperäislähteet ja Parempia Uutisia -palvelun lähdeperiaatteet.", "/lahteet"); }

export default function SourcesPage() {
  const sources = getSources().filter((source) => source.enabled && !source.id.startsWith("demo-"));
  return <div className={styles.content}>
    <PageHeading title="Lähteet" description="Uutinen on vain niin hyvä kuin sen lähde." />
    <p className={styles.intro}>Valitsemme tunnistettavia uutisjulkaisijoita, viranomaisia ja tutkimusorganisaatioita. Lähteen käyttöehdot ja uutisaineiston saatavuus tarkistetaan ennen sen ottamista mukaan.</p>
    <div className={styles.prose}>
      <p>Suosimme alkuperäistä tietoa ja riippumatonta raportointia, kun sitä on saatavilla. Organisaation oma tiedote voi kertoa sen toiminnasta, mutta kyseessä on silloin organisaation oma lähde. Lähteen mukanaolo ei takaa yksittäisen uutisen julkaisua.</p>
    </div>
    <div className={styles.sources}>
      {sources.map((source) => <section key={source.id} className={styles.source}>
        <div><h2>{normalizePublicText(source.name)}</h2><span className={styles.sourceMeta}>{SOURCE_TYPE_LABELS[source.sourceType]}</span><span className={styles.sourceMeta}>{source.language === "fi" ? "Suomenkielinen lähde" : "Kansainvälinen lähde, tiivistelmät suomeksi"}</span></div>
        <div>
          <p>{source.contentLicense ? `Lähdetekstin käyttöperuste: ${normalizePublicText(source.contentLicense)}. Tiivistelmä on muokattu lähdeaineistosta.` : "Lähteen aineistoa käytetään lyhyiden uutistiivistelmien pohjana sen toimituksellisen käytön ehtojen mukaan."}</p>
          <p className={styles.sourceMeta}>Kuvia ei julkaista ilman kuvakohtaista oikeuden ja asiayhteyden tarkistusta.</p>
          {source.endpointVerifiedAt && <p className={styles.sourceMeta}>Syöte tarkistettu {formatFinnishDate(source.endpointVerifiedAt)}.</p>}
          <div className={styles.sourceLinks}><a href={source.homepageUrl} rel="external noopener noreferrer">Lähteen verkkosivusto ↗</a>{source.termsUrl && <a href={source.termsUrl} rel="external noopener noreferrer">Käyttöehdot ↗</a>}</div>
        </div>
      </section>)}
    </div>
    {!sources.length && <p>Yhtään uutislähdettä ei ole vielä otettu käyttöön.</p>}
    {process.env.DEMO_MODE === "true" && <p className={styles.note}>Esittelytilan kuvitteelliset jutut on merkitty kehitysaineistoksi. Niiden esimerkkilähteet eivät kuulu yllä olevaan uutislähteiden valikoimaan.</p>}
  </div>;
}
