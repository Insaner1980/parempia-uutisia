# Kehitysaineisto

Tämä hakemisto sisältää sivuston käyttöliittymän testiaineiston, ei julkaisujonoa. `articles.ts` sisältää 23 kuvitteellista suomenkielistä juttua ja yhden erikseen tarkistetun NASA-jutun. Kaikissa on `isFixture: true`. Kuvitteellisten juttujen lähteen nimi kertoo niiden luonteen, ja alkuperäislinkit käyttävät esimerkeille varattua `example.org`-verkkotunnusta. Niitä ei pidä esittää oikeina uutisina.

Aineisto kattaa kaikki seitsemän aihetta, molemmat alueet, lyhyet ja pitkät otsikot sekä kuvallisen ja kuvattoman jutun. Kissanpennut, kultapandan poikaset ja kotiin palaava koira edustavat myös pieniä eläinaiheita. Kuvitteellisten juttujen ajankohdat lasketaan siemennyksen ajasta, jotta hakurajausten testit eivät vanhene. NASA-jutun oikea alkuperäinen julkaisuaika säilyy muuttumattomana.

## Käyttö

Demotila edellyttää `DEMO_MODE=true` ja nimenomaisesti asetettua `DATABASE_PATH`-polkua, jonka tiedostonimi on `demo.sqlite`. Komento `pnpm seed:demo` ei käytä oletuksena tuotantokantaa eikä saa vaihtaa kantapolkua huomaamatta. Tuotantotilassa ajettava demoesikatselu vaatii lisäksi `ALLOW_DEMO_PREVIEW=true`. Uudelleen suorittaminen päivittää saman demoaineiston.

Kuvitteellinen sisältö kuuluu vain näkyvästi merkittyyn demotilaan. Jokainen selaintestiajo luo uuden erillisen `data/e2e-<tunniste>/demo.sqlite`-kannan ja kertoo sen polun käynnistyessään. Testikannat säilyvät tarkistuksia varten Gitin ohittamassa `data/`-hakemistossa. Demotilassa julkaistuja sivuja ei saa indeksoida.

## NASA-kuvan tarkistettu alkuperä

- Juttu: [Roman Space Telescope Travels to SpaceX Hangar](https://www.nasa.gov/image-article/roman-space-telescope-travels-to-spacex-hangar/)
- Julkaisu: 26.8.2026 klo 18.40.19 UTC, vahvistettu NASAn RSS-syötteestä.
- Tapahtuma: teleskoopin kuljetus 25.8.2026 Kennedyn avaruuskeskuksessa. Julkaisu ei kerro jo tapahtuneesta laukaisusta.
- Kuva: jutun oma valokuva, [alkuperäinen tiedosto](https://www.nasa.gov/wp-content/uploads/2026/08/ksc-20260825-ph-ser01-0001orig.jpg). Paikallinen kopio on NASAn 1200 x 800 pikselin kokoversio, joka säilyttää kuvasuhteen.
- Paikallinen tiedosto: `public/demo/roman-avaruusteleskooppi.jpg`.
- Kuvaaja ja lähde: NASA/Sydney Rohde (Rocz).
- Käyttöehdot: [NASA Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/).
- Käyttöoikeuden peruste: NASA sallii aineistonsa toimituksellisen käytön uutisessa lähdemaininnalla, myös kaupallisen julkaisun toimituksellisessa sisällössä. Tiedostolle ei löytynyt erillistä kolmannen osapuolen tekijänoikeusmerkintää. Tätä kuvaa ei väitetä automaattisesti tekijänoikeudesta vapaaksi.
- Rajoitus: kuvaa käytetään vain tämän tapahtuman toimituksellisena kuvituksena. Kuvassa esiintyvät tunnukset eivät ole tämän sivuston brändi eivätkä NASAn suositus palvelulle. Kuvaa ei käytetä mainontaan tai myynninedistämiseen.
- Lähdesivu, kuvatiedosto, mitat ja käyttöehdot tarkistettiin 27.8.2026. Tämä manuaalinen tarkistus ei anna automaattista lupaa muiden NASA-kuvien käyttöön.

Kuvitteellisille jutuille ei ole lisätty kuvia. Niille ei saa etsiä tai luoda yleiskuvia.
