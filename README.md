# Parempia Uutisia

Suomenkielinen uutiskooste: myönteisiä tapahtumia Suomesta ja maailmalta, lyhyet tiivistelmät ja selkeät linkit alkuperäisiin lähteisiin. Sivusto ei julkaise kokonaisia lähdeartikkeleita. Uutiset luetaan SQLite-tietokannasta, ei Markdown-tiedostoista.

Lähtökansiossa oli vain tyhjä `.sonar`-hakemisto. Siellä ei ollut sovellusta, Git-repositoriota, suunnittelutiedostoja tai tehtävänannossa mainittuja vertailukuvia. Toteutus rakennettiin alusta. Kuvia tai aiempaa käyttäjän työtä ei poistettu.

## Käynnistä tässä työtilassa

Paikallinen `.env.local`, satunnainen hallinnan avain ja erillinen demotietokanta on valmisteltu. Avainta ei ole tallennettu versionhallintaan tai tähän ohjeeseen.

```powershell
Set-Location 'C:\Dev\Parempia Uutisia'
pnpm dev
```

Avaa [http://localhost:3000](http://localhost:3000). Hallinta on osoitteessa [http://localhost:3000/hallinta](http://localhost:3000/hallinta). Kirjautumiseen käytetään paikallisen `.env.local`-tiedoston `ADMIN_SECRET`-arvoa. Älä jaa avainta tai sitä sisältävää kuvakaappausta.

Pysäytä palvelin samalla päätteellä painamalla `Ctrl+C`. Komennot sitovat palvelimen oletuksena vain paikalliseen osoitteeseen `127.0.0.1`.

## Tekniikka

| Osa | Toteutus |
| --- | --- |
| Sovellus | Next.js 16.3.3, App Router, React 19.2.8 |
| Kieli | TypeScript 6.0.3, strict-tila |
| Ajonaikainen ympäristö | Node.js 24 LTS, pnpm 11.20.0 |
| Tietokanta | SQLite, better-sqlite3 13.0.3, Drizzle ORM 0.45.2 |
| Syötteet | RSS, Atom, JSON Feed ja kenttäkartoituksella määritettävä JSON-rajapinta |
| Validointi | Zod 4, tarkasti rajattu AI-tulos |
| Ulkoasu | Oma CSS, CSS Modules, yhteiset värit ja mitat |
| Fontit | Newsreader otsikoissa, News Cycle 400/700 tukiteksteissä. News Cycle ladataan paikallisesti Next.js:n fontti-integraatiolla. |
| Tarkistukset | ESLint, TypeScript, Node-testit, Playwright ja axe |

TypeScriptin ja ESLintin pääversiot on valittu Next.js:n linttilisäosien tukemista versioista. Tarkat riippuvuudet ovat `package.json`- ja `pnpm-lock.yaml`-tiedostoissa. Dockeria, ulkoista tietokantapalvelua tai käyttöliittymäkirjastoa ei tarvita.

## Asennus uuteen työtilaan

Asenna [Node.js 24 LTS](https://nodejs.org/en/download) ja pnpm. Jos pnpm puuttuu:

```powershell
npm install --global pnpm@11.20.0
```

Projektihakemistossa:

```powershell
pnpm install --frozen-lockfile
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

Muokkaa `.env.local`-asetukset haluamallesi toimintatilalle. Älä korvaa olemassa olevaa asetustiedostoa tai toisen tilan tietokantaa. `pnpm-workspace.yaml` sallii vain projektin tarvitsemien nimettyjen natiiviriippuvuuksien asennusskriptit.

## Asetukset

| Muuttuja | Merkitys |
| --- | --- |
| `SITE_URL` | Sivuston tarkka alkuperäosoite. Paikallisesti `http://localhost:3000`. Hallinnan POST-pyyntöjen Origin-arvon on vastattava tätä. Julkisessa käytössä HTTPS. |
| `DATABASE_PATH` | Paikallinen SQLite-tiedosto, esimerkiksi `data/news.sqlite`. Ei verkkotietokantaosoite. |
| `DEMO_MODE` | `true` näyttää vain erikseen merkityt kehitysesimerkit. Oletus `false`. |
| `ALLOW_DEMO_PREVIEW` | Lisäksi `true`, jos demoa katsellaan paikallisesti tuotantobuildilla. Ei tuotannon uutisjulkaisua varten. |
| `AI_PROVIDER` | `deepseek` ottaa määritetyn yhteensopivan palvelun käyttöön. |
| `DEEPSEEK_API_KEY` | Vain palvelimella käytettävä API-avain. |
| `DEEPSEEK_BASE_URL` | Esimerkiksi `https://api.deepseek.com`. Ei `chat/completions`-päätettä. |
| `DEEPSEEK_MODEL` | Tilillä käytettävissä oleva malli. Mallin nimeä ei ole kovakoodattu. |
| `ADMIN_SECRET` | Vähintään 32 merkkiä pitkä satunnainen ylläpitoavain. Ilman avainta hallinta on suljettu myös kehitystilassa. |
| `CONTACT_EMAIL` | Valinnainen oikea yhteysosoite. Tyhjänä osoitetta tai yhteydenottolomaketta ei näytetä. |
| `INGEST_MAX_AGE_DAYS` | Uutisen enimmäisikä, oletus 30 päivää, sallittu 1-90. |
| `INGEST_MAX_ITEMS_PER_SOURCE` | Enintään käsiteltävät uutiset lähdettä kohden, oletus 20, sallittu 1-40. |
| `MIN_POSITIVE_CENTRALITY` | Myönteisen kehityksen keskeisyyden alaraja, oletus 0.80. |
| `MIN_FACTUAL_CONFIDENCE` | Faktavarmuuden alaraja, oletus 0.90. |
| `MIN_SOURCE_SUFFICIENCY` | Lähdeaineiston riittävyyden alaraja, oletus 0.85. |

Next.js ja komentorivin skriptit lukevat `.env.local`-asetukset. Prosessille erikseen asetetut ympäristömuuttujat ovat etusijalla. Älä käytä avaimille `NEXT_PUBLIC_`-alkuisia nimiä. `.env*`, tietokannat ja testitulokset on jätetty `.gitignore`-tiedostossa versionhallinnan ulkopuolelle.

## Kehitysesimerkit ilman AI-avainta

Aseta paikalliseen asetustiedostoon:

```dotenv
DATABASE_PATH=data/demo.sqlite
DEMO_MODE=true
ALLOW_DEMO_PREVIEW=true
```

```powershell
pnpm db:migrate
pnpm seed:demo
pnpm dev
```

Demo sisältää 24 juttua: kaikki seitsemän aihetta, molemmat alueet, pitkät ja lyhyet otsikot sekä kuvallisen ja kuvattomia juttuja. Suurin osa tapahtumista ja lähteistä on tarkoituksella kuvitteellisia. NASAn kuvallinen esimerkki perustuu oikeaan lähteeseen. Ne erotetaan ajankohtaisesta uutisjulkaisusta ilmoituksella jokaisella sivulla ja tarkennuksella uutisivulla. Kuvitteellisten lähteiden linkit käyttävät testikäyttöön varattua `example.org`-verkkotunnusta.

`pnpm seed:demo` on toistettava alustus. Se vaatii erikseen valitun demotilan ja täsmälleen `demo.sqlite`-nimisen tiedoston. Kantaan tallennetaan toimintatila: live-tilalla ei voi avata demokantaa, eikä kehitysaineistoa voi kylvää live-kantaan. Tuotantobuildin demoesikatselu vaatii vielä erillisen luvan. Demo on aina `noindex`, sen robots-tiedosto estää indeksoinnin ja sivukartta on tyhjä.

Demotilassa `pnpm ingest` ja hallinnan **Suorita esimerkkiajo** käyttävät samaa käsittelyputkea, paikallisia syöte-esimerkkejä ja `FixtureAIProvider`-palvelua. Ne eivät tee verkko- tai AI-pyyntöjä. Jo kylvetyt jutut tunnistetaan samoiksi uutisiksi. Esimerkkiajo ilmoittaa selvästi, että kyse on testiaineistosta. `AI_PROVIDER=mock` ei mahdollista oikeiden uutisten näennäistä AI-käsittelyä.

Kuvan lähdetiedot ja esimerkkiaineiston tarkemmat rajaukset ovat [fixtures/README.md](fixtures/README.md).

## Oikean uutisvirran käyttöönotto

Valitse uusi live-tietokanta. Älä nimeä demokantaa uudelleen live-kannaksi.

```dotenv
DATABASE_PATH=data/news.sqlite
DEMO_MODE=false
ALLOW_DEMO_PREVIEW=false
AI_PROVIDER=deepseek
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=
```

Täytä avain ja tililläsi käytettävissä oleva malli yksityiseen `.env.local`-tiedostoon. Toteutus käyttää palvelimelta `POST /chat/completions` -kutsua ja JSON-vastausmuotoa. [DeepSeekin JSON-ohje](https://api-docs.deepseek.com/guides/json_mode/) kuvaa rajapinnan toimintaa. Tulos validoidaan uudelleen paikallisesti; JSON-tilan käyttö ei yksin riitä julkaisemiseen.

```powershell
pnpm db:migrate
pnpm ingest
pnpm build
pnpm start
```

Ilman kaikkia AI-asetuksia oikeat syötteet voidaan hakea ja ehdokkaat tallentaa, mutta ne jäävät julkaisematta. Rikkinäinen, liian pitkä, epävarma tai muuten kelpaamaton vastaus ei pääse julkiseksi. Myöhemmässä ajossa odottava ehdokas voidaan käsitellä, jos se on edelleen syötteessä ja aikaikkunassa. Alkuperäinen pitkä teksti haetaan tällöin uudestaan; sitä ei säilytetä kokonaisena tietokannassa.

Hallinta näyttää hakujen tulokset, lähteiden tilat, viimeisen onnistuneen haun ja lyhyet virhetiedot. Lähteitä voi kytkeä päälle tai pois. Julkaistun virheellisen jutun voi poistaa näkyvistä. Hallinnassa ei ole artikkelieditoria tai päivittäistä hyväksymisjonoa.

## Varmennetut lähteet

Alkuvalikoima tarkistettiin 27.8.2026 oikeilla HTTP-pyynnöillä. Molemmat syötteet ja niiden robots-säännöt vastasivat onnistuneesti.

| Lähde | Syöte | Käyttöperuste ja rajoitus |
| --- | --- | --- |
| Helsingin kaupunki | `https://www.hel.fi/fi/uutiset/rss` | [Virallinen RSS-ohje ja käyttöehdot](https://www.hel.fi/fi/paatoksenteko-ja-hallinto/tietoapalvelusta), tekstit CC BY 4.0. Poiminta sallitaan vain määritellystä uutistekstin elementistä `/fi/uutiset/`-polulla. Kuvia ei oteta käyttöön syötteestä. |
| NASA | `https://www.nasa.gov/feed/` | [Virallinen RSS-luettelo](https://www.nasa.gov/rss-feeds/) ja [toimituksellisen käytön ehdot](https://www.nasa.gov/nasa-brand-center/images-and-media/). Aineisto saadaan syötteestä; artikkelisivujen poiminta on pois käytöstä. Kuvalupaa ei oleteta koko lähteelle. |

Molemmat ovat organisaatioiden omia lähteitä, eivät riippumattomia uutistoimituksia. Tämä lähdetyyppi näkyy uutisivulla. Valikoima on aluksi pieni eikä kata tasaisesti kaikkia Suomen alueita tai aiheita. Tilastokeskus jätettiin valikoiman ulkopuolelle, koska nykyistä uutissyötettä ei saatu vahvistettua virallisesta dokumentaatiosta. Muita arvaamalla lisättyjä tai automaattisesti aktivoitavia lähteitä ei ole.

### Lähteen lisääminen

Lisää tietue tiedostoon `src/server/source-registry.ts` vasta, kun virallinen dokumentaatio, käyttöehdot, robots-säännöt ja oikea koepyyntö on tarkistettu. Tallenna tarkistuspäivä ja perustelu. Epäselvä lähde pidetään `enabled: false` -tilassa ilman varmennettua päätepistettä. Hallinta ei voi syöttää uusia osoitteita tai ottaa varmentamatonta lähdettä käyttöön.

`allowedHosts` sisältää vain tarpeelliset täsmälliset palvelinnimet. RSS ja Atom käyttävät `fetchMethod: "rss"` -asetusta. JSON Feed käyttää `"json-feed"`-asetusta. Dokumentoidulle JSON-rajapinnalle käytetään `"json-api"`-asetusta ja `jsonApiMapping`-kenttien polkuja. Artikkelisivun poiminta vaatii erikseen `articleExtractionAllowed`, sallitut polkualut ja `articleTextSelector`-valitsimen. Syötteen HTML:ää ei koskaan renderöidä sellaisenaan.

## Julkaisurajat ja tietoturva

Uutisputki normalisoi URL-osoitteet, poistaa seurantaparametrit ja vertaa otsikoita, ajankohtia, nimettyjä kohteita ja tekstisormenjälkiä. Samasta tapahtumasta valitaan vahvempi lähde ja vaihtoehtoiset lähteet säilytetään sisäisesti. Etusivun valinta estää saman uutisen toiston eri osioissa.

Lähde- ja AI-pyynnöt sallivat vain HTTPS:n ja määritetyt palvelinnimet. DNS-vastaukset tarkistetaan, yksityisosoitteet torjutaan ja yhteys sidotaan tarkistettuun IP-osoitteeseen. Myös uudelleenohjaukset ja robots-säännöt tarkistetaan. Pyyntöjen kokoa, kestoa ja uusintamäärää rajoitetaan. Lähdekohtainen pyyntöväli on vähintään kaksi sekuntia; robots-ohje ja palvelimen pyytämä pidempi odotus huomioidaan. Yhden lähteen virhe ei poista jo julkaistuja uutisia.

SQLite-lukko estää samanaikaiset ajot myös eri prosesseista. Ajon aikaraja on kymmenen minuuttia. Lukko vanhenee kahdessatoista minuutissa. Seuraava ajo vapauttaa vanhentuneen lukon ja kirjaa keskeytyksen ajolokiin.

Kantaan tallennetaan vain lyhyt alkuperäisote, lähde- ja päätöstiedot, sormenjäljet ja suomenkielinen tiivistelmä. Kokonainen artikkeliteksti käsitellään väliaikaisesti muistissa. Virhelokiin ei kirjoiteta lähteen pitkää sisältöä, AI-vastausta tai avaimia.

Hallinnan istunto on allekirjoitettu, kahdeksan tuntia voimassa oleva HttpOnly-eväste. Muuttavat toiminnot vaativat istunnon ja saman Originin. Kirjautumisyrityksiä rajoitetaan. Julkisessa käytössä määritä oikea HTTPS-osoite, suojaa `.env.local` ja tietokanta käyttöjärjestelmän käyttöoikeuksilla ja huolehdi palvelimen varmuuskopioinnista.

## Kuvien oikeudet

Oletus on aina kuvaton uutinen. Syötteestä löytyvä kuva, Open Graph -osoite tai organisaation tunnettu nimi ei ole kuvalupa.

Hyväksytyn kuvan on liityttävä täsmälleen uutiseen. Käyttöperuste, alkuperä, kuvaaja, suomenkielinen kuvateksti ja vaihtoehtoinen teksti sekä mitat tallennetaan `ImageMetadata`-tietoihin. Sekä `imageRelevanceConfirmed` että `imageRightsConfirmed` on oltava `true`, ja `imageRightsStatus` on oltava `approved`. Tuntemattomat, kielletyt ja ei-kaupalliset luvat estävät kuvan näyttämisen.

Hyväksytty kuva kopioidaan paikallisesti `public/media`-hakemistoon, esimerkkikuva `public/demo`-hakemistoon. Kuvat toimitetaan Next.js:n kuvanoptimoinnin kautta. Ulkopuolisia kuvia ei kuumalinkitetä, eikä automaattista kuvahakua ole. Live-uutisputki julkaisee oletuksena kuvattomia uutisia; kuvakohtainen oikeustarkistus ja metadatan lisääminen on tarkoituksella erillinen ylläpitotoimi, ei AI:n arvaus. Jos kuvatiedostoa ei saada ladattua, kuvaelementti poistuu eikä tilalle tule paikkamerkkiä.

## Reitit ja kielet

Etusivu `/`, uutisvirta `/uusimmat`, alueet `/suomi` ja `/maailmalta`, haku `/haku` sekä tiivistelmä `/uutinen/[slug]`.

Aiheet ovat `/aihe/elaimet`, `/aihe/luonto`, `/aihe/tiede-ja-teknologia`, `/aihe/terveys`, `/aihe/ihmiset-ja-yhteisot`, `/aihe/yhteiskunta` ja `/aihe/kulttuuri-ja-oppiminen`. Alue ei ole aihe. Julkaistulla uutisella on täsmälleen yksi kumpaakin.

Tietosivut ovat `/lahteet`, `/miten-tama-toimii`, `/tietoa` ja `/tietosuoja`. `/hallinta` ja sen POST-rajapinnat on suojattu erikseen. Englanninkielistä julkaisua, kielivalitsinta, tagipilveä, käyttäjätilejä, kommentteja, uutiskirjettä tai mainoksia ei ole.

Sivut renderöidään palvelimella. Tietokantasisältöä ei jäädä tarjoamaan vanhasta sivuvälimuistista julkaisun poistamisen jälkeen. Staattiset fontit ja optimoidut kuvat välimuistitetaan. Live-sivukartta sisältää vain julkaistut oikeat uutiset; hallintaa ja hakutuloksia ei indeksoida. Päivämäärät tallennetaan UTC-muodossa ja näytetään Helsingin aikavyöhykkeellä.

## Komennot ja tarkistukset

| Komento | Toiminta |
| --- | --- |
| `pnpm dev` | Paikallinen kehityspalvelin |
| `pnpm build` | Tuotantobuild |
| `pnpm start` | Valmiin tuotantobuildin paikallinen palvelin |
| `pnpm db:migrate` | Valitun kannan idempotentti alustus ja lähderekisterin synkronointi |
| `pnpm seed:demo` | Erillinen ja toistettava kehitysaineiston alustus |
| `pnpm ingest` | Live-uutishaku tai erikseen merkityn demotilan paikallinen esimerkkiajo |
| `pnpm lint` | Staattinen kooditarkistus |
| `pnpm typecheck` | Next.js-reittityypit ja TypeScript strict -tarkistus |
| `pnpm test` | Yksikkö- ja integraatiotestit sekä ulkoasun lähdekooditarkistus |
| `pnpm test:design` | Kielletyt merkit ja CSS-muodot, myös merkkijonojen Unicode-escape-arvot |
| `pnpm test:e2e` | Chromium, toiminnalliset testit, axe ja kuvakaappaukset |

Ensimmäistä selaintestiä varten asenna testiselain:

```powershell
pnpm exec playwright install chromium
pnpm lint
pnpm typecheck
pnpm test
pnpm test:design
pnpm test:e2e
pnpm build
```

Tuotantobuildin selaintarkistus:

```powershell
$env:E2E_PRODUCTION = 'true'
pnpm test:e2e
Remove-Item Env:E2E_PRODUCTION
```

Selaintestit käyttävät porttia 3100 ja joka ajossa uutta demokantaa `data/e2e-*`-hakemistossa. Ne eivät muokkaa omistajan `data/demo.sqlite`- tai live-kantaa eivätkä kutsu oikeita syötteitä tai AI-palvelua. Testipalvelin ja sen omat lapsiprosessit suljetaan ajon lopuksi. Raportti, virhejäljet ja 1440, 1024 ja 390 pikselin kuvakaappaukset tallentuvat `output/playwright`-hakemistoon.

Testit kattavat muun muassa duplikaatit myös myöhemmässä AI-käsittelyssä, tietokannan tallennuksen, hakurajaukset, aluejaon, julkaisukynnykset, virheellisen AI-vastauksen, kuvalupien portin, robots- ja SSRF-rajat, lähdehäiriöt, ajolukon ja hallinnan tunnistautumisen. Selaimessa tarkistetaan myös molemmat teemat, kosketusleveydet, näppäimistö, tyhjä haku, alkuperäislinkit, konsolivirheet ja kielletyt merkit näkyvässä tekstissä sekä metadatassa.

## Rajaukset

Oikeaa DeepSeek-avainta ei ollut toteutuksen aikana käytettävissä. Palvelinadapteri ja virherajat on testattu, mutta elävää mallikutsua tai oikeiden AI-tiivistelmien toimituksellista laatua ei ole väitetty varmennetuksi. AI:n antamat luottamusluvut eivät takaa virheettömyyttä.

Sovellus on valmis paikalliseen käyttöön. Julkista palvelinta, verkkotunnusta tai ajastettua käyttöjärjestelmätehtävää ei ole luotu. Automaattinen käsittely käynnistyy `pnpm ingest` -komennosta tai hallinnasta; halutun ajoituksen voi myöhemmin määrittää palvelinympäristössä. Suositeltu aloitusväli on 30-60 minuuttia lähteiden ehtojen rajoissa.

SQLite-tiedoston pitää olla pysyvällä paikallisella levyllä. Tämä toteutus ei ole tarkoitettu usean palvelimen tai lyhytikäisen serverless-tiedostojärjestelmän yhteiseksi tietokannaksi. Lähteiden syötteet ja ehdot voivat muuttua. Saavutettavuustarkistus sisältää automaattisen tarkistuksen ja käytännön näppäimistö- ja ulkoasutarkastelun, ei kaikkia avustavia teknologioita kattavaa sertifiointia.
