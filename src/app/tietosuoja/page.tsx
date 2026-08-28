import { PageHeading } from "@/components/ArticleList";
import { contactEmail, metadataFor } from "@/lib/metadata";
import styles from "@/components/Information.module.css";

export function generateMetadata() { return metadataFor("Tietosuoja", "Mitä Parempia Uutisia tallentaa selaimeen ja miten uutislähteiden tietoja käsitellään.", "/tietosuoja"); }

export default function PrivacyPage() {
  const email = contactEmail();
  return <div className={styles.content}>
    <PageHeading title="Tietosuoja" description="Lukeminen ei edellytä rekisteröitymistä." />
    <div className={styles.prose}>
      <h2>Ei lukijatilejä tai seurantaa</h2>
      <p>Tässä sovelluksessa ei ole lukijatilejä, kommentointia, analytiikkapalvelua, mainoksia tai seurantapikseleitä. Hakusanoista ei rakenneta lukijaprofiilia.</p>
      <h2>Selaimeen tallentuva ulkoasu</h2>
      <p>Jos valitset vaalean tai tumman ulkoasun, valinta tallennetaan selaimesi paikalliseen tallennustilaan nimellä pu-theme. Sitä käytetään vain ulkoasun muistamiseen. Valitsemalla Järjestelmä poistat tallennetun valinnan. Voit poistaa sen myös selaimen asetuksista.</p>
      <h2>Haku ja verkkoyhteys</h2>
      <p>Hakusanat ja rajaukset näkyvät sivun osoitteessa. Osoite voidaan tallentaa selaushistoriaan, ja jaettu hakulinkki sisältää myös käyttämäsi hakusanat. Älä kirjoita hakuun arkaluonteisia henkilötietoja.</p>
      <p>Sivujen toimittaminen edellyttää verkkopyyntöjä. Palvelimen ylläpitoympäristö voi käsitellä pyyntöjen teknisiä tietoja, kuten IP-osoitetta ja pyydettyä osoitetta. Tämä sovellus ei tallenna niistä erillistä kävijärekisteriä.</p>
      <h2>Ylläpidon kirjautuminen</h2>
      <p>Vain ylläpitäjän kirjautumisessa käytetään parempia_hallinta-evästettä. Se on välttämätön hallinnan suojaamiseksi ja vanhenee kahdeksassa tunnissa. Eväste poistetaan uloskirjautumisessa. Tavalliseen uutisten lukemiseen sitä ei tarvita.</p>
      <h2>Uutislähteet ja automaattinen käsittely</h2>
      <p>Uutisputki käsittelee julkisten lähteiden uutisaineistoa palvelimella. Kun AI-palvelu on määritetty, sille lähetetään uutisen tiivistämiseen tarvittava lähdeaineisto. Lukijan hakuja tai selaushistoriaa ei lähetetä AI-palvelulle.</p>
      <p>Alkuperäisen uutisen linkki vie toiselle verkkosivustolle, jonka omat tietosuojakäytännöt ovat voimassa. Sivuston fontit ja käytössä olevat uutiskuvat toimitetaan tämän palvelun kautta.</p>
      {email && <><h2>Yhteydenotot</h2><p>Tietosuojaan liittyvät kysymykset: <a href={`mailto:${email}`}>{email}</a>.</p></>}
    </div>
  </div>;
}
