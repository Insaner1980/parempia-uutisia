import Link from "next/link";
import { PageHeading } from "@/components/ArticleList";
import { contactEmail, metadataFor } from "@/lib/metadata";
import styles from "@/components/Information.module.css";

export function generateMetadata() { return metadataFor("Miten tämä toimii", "Näin lähteet valitaan, uutiset tiivistetään ja kuvien käyttöoikeudet tarkistetaan.", "/miten-tama-toimii"); }

export default function HowPage() {
  const email = contactEmail();
  return <div className={styles.content}>
    <PageHeading title="Miten tämä toimii" description="Alkuperäinen lähde on jokaisen uutisen lähtökohta." />
    <p className={styles.intro}>Parempia Uutisia auttaa löytämään myönteisiä tapahtumia uutisvirrasta. Lyhyt tiivistelmä kertoo olennaisen ja ohjaa alkuperäisen uutisen luo.</p>
    <div className={styles.prose}>
      <h2>Valitut lähteet</h2>
      <p>Keräämme uutislinkkejä erikseen hyväksyttyjen lähteiden syötteistä tai rajapinnoista. Tarkistamme lähteen tunnistettavuuden, käyttöehdot ja teknisen toimivuuden ennen käyttöönottoa. Viranomaisen tai organisaation omasta toiminnasta kertova uutinen erotetaan riippumattomasta raportoinnista.</p>
      <p><Link href="/lahteet">Käytössä olevat lähteet</Link> ovat julkisesti nähtävissä. Emme kierrä maksumuureja.</p>
      <h2>Tapahtunut asia, myönteinen kehitys</h2>
      <p>Uutisen pitää kertoa todellisesta tapahtumasta, tuloksesta tai kehityksestä. Tarkistamme julkaisupäivän, lähdeaineiston riittävyyden ja sen, onko myönteinen asia jutun keskiössä. Vanhat kiertävät tarinat, mainokset, mielipidekirjoitukset ja todentamattomat väitteet eivät kuulu valikoimaan.</p>
      <p>Myös pienet ihmis- ja eläintarinat voivat olla uutisia. Söpö eläin ei tarvitse suurta yhteiskunnallista merkitystä, mutta tarinalla pitää olla tunnistettava alkuperä.</p>
      <h2>Lyhyt automaattinen tiivistelmä</h2>
      <p>Tiivistelmät tuotetaan automaattisesti lähdeaineistosta. Niissä kerrotaan, mitä tapahtui, missä ja miksi se on merkityksellistä. Tarvittavat varaukset säilytetään. Emme julkaise kokonaisia lähdeartikkeleita tai lisää lähteestä puuttuvia tietoja.</p>
      <p>Jokaisella uutisella on yksi aihe ja yksi alue: Suomi tai Maailmalta. Samaa tapahtumaa käsitteleviä uutisia yhdistetään, jotta yksi juttu ei toistu etusivulla. Jos aineisto tai käsittelyn varmuus ei riitä, uutinen jää julkaisematta.</p>
      <h2>Kuva vain, kun se kuuluu uutiseen</h2>
      <p>Kuvan pitää liittyä juuri kyseiseen tapahtumaan, henkilöön, eläimeen tai kehitykseen. Lisäksi sen julkaisemiseen tarvitaan erikseen vahvistettu käyttöoikeus. Kuvaaja, kuvan alkuperä ja käyttöperuste tallennetaan.</p>
      <p>Siksi monet uutiset näkyvät ilman kuvaa. Emme täytä tilaa kuvituskuvilla, yleisillä kuvapankkikuvilla tai tekoälykuvilla.</p>
      <h2>Alkuperäinen uutinen ja korjaukset</h2>
      <p>Tiivistelmä ei korvaa lähdettä. Jokaisessa jutussa on alkuperäisen julkaisun nimi, päivämäärä ja linkki. Automaattinen käsittely voi erehtyä. Virheellinen tiivistelmä voidaan poistaa julkaisusta, kun virhe havaitaan.</p>
      {email && <p>Korjauspyynnöt: <a href={`mailto:${email}`}>{email}</a>.</p>}
      {process.env.DEMO_MODE === "true" && <section id="esittelytila">
        <h2>Tämän version esittelytila</h2>
        <p>Nyt näkemäsi sisältö on erillisessä kehitystietokannassa. Suurin osa esimerkkitapahtumista ja niiden lähteistä on kuvitteellisia. NASAn kuvallinen esimerkki pohjautuu oikeaan uutiseen. Esimerkit on merkitty myös omilla uutisivuillaan.</p>
        <p>Esittelyaineistoa ei käsitellä ajankohtaisena uutisjulkaisuna eikä se pääse tuotannon uutiskantaan. Oikean uutiskäsittelyn käynnistäminen vaatii ylläpidon määrittämän AI-palvelun. Ilman toimivaa palvelua uutisehdokkaita ei julkaista.</p>
      </section>}
    </div>
  </div>;
}
