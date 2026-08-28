import Link from "next/link";
import { PageHeading } from "@/components/ArticleList";
import { contactEmail, metadataFor } from "@/lib/metadata";
import styles from "@/components/Information.module.css";

export function generateMetadata() { return metadataFor("Tietoa meistä", "Parempia Uutisia kokoaa myönteisiä uutisia alkuperäisistä lähteistä, lyhyesti ja suomeksi.", "/tietoa"); }

export default function AboutPage() {
  const email = contactEmail();
  return <div className={styles.content}>
    <PageHeading title="Parempia Uutisia" description="Tilaa myös sille, mikä menee eteenpäin." />
    <p className={styles.intro}>Uutisissa on aihetta huoleen. Niissä on myös korjattuja epäkohtia, toipuvaa luontoa, uusia löytöjä ja ihmisiä, jotka auttavat toisiaan. Haluamme tehdä nämä tapahtumat helpommiksi löytää.</p>
    <div className={styles.prose}>
      <h2>Uutiskooste suomeksi</h2>
      <p>Parempia Uutisia kokoaa lyhyitä tiivistelmiä valituista uutislähteistä. Mukana on uutisia Suomesta ja muualta maailmasta. Kaikki tiivistelmät ovat suomeksi.</p>
      <p>Emme tee alkuperäistä uutisraportointia emmekä julkaise toisten artikkeleita kokonaisina. Uutisen yhteydessä kerromme lähteen ja alkuperäisen julkaisupäivän. Lähdelinkistä pääset lukemaan alkuperäisen jutun.</p>
      <h2>Hyvä uutinen saa olla myös pieni</h2>
      <p>Lääketieteen edistysaskel ja kotiin päässyt löytöeläin ovat erilaisia uutisia. Molemmat voivat kuulua tänne, kun tapahtuma on todennettavissa ja myönteinen asia on jutun ydin.</p>
      <p>Hyvä uutinen ei edellytä varmuutta paremmasta tulevaisuudesta. Kerromme myös rajauksista, keskeneräisyydestä ja epävarmuudesta, kun ne ovat uutisen ymmärtämisen kannalta olennaisia.</p>
      <Link href="/miten-tama-toimii" className="text-link">Miten uutiset valitaan ja tiivistetään →</Link>
      {email && <><h2>Yhteydenotot ja korjaukset</h2><p>Jos huomaat virheen, kerro siitä osoitteeseen <a href={`mailto:${email}`}>{email}</a>. Liitä viestiin uutisen osoite ja tieto siitä, mikä on korjattava.</p></>}
    </div>
  </div>;
}
