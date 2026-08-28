import type { Article, ArticleSource, CategorySlug, Region } from "../src/lib/domain";

export const DEMO_LEAD_SLUG = "demo-ennallistettu-kosteikko";
export const DEMO_IMAGE_SLUG = "demo-roman-avaruusteleskooppi";
export const DEMO_NASA_URL = "https://www.nasa.gov/image-article/roman-space-telescope-travels-to-spacex-hangar/";

export const demoSources = [
  {
    id: "demo-suomi",
    name: "Kuvitteellinen kehitysaineisto, Suomi",
    homepageUrl: "https://example.org/",
    defaultRegion: "Suomi",
    sourceType: "organization",
  },
  {
    id: "demo-maailma",
    name: "Kuvitteellinen kehitysaineisto, maailma",
    homepageUrl: "https://example.org/",
    defaultRegion: "Maailmalta",
    sourceType: "organization",
  },
  {
    id: "demo-nasa",
    name: "NASA, kehitysesimerkki",
    homepageUrl: "https://www.nasa.gov/",
    defaultRegion: "Maailmalta",
    sourceType: "institution",
    contentLicense: "NASAn toimituksellisen käytön lupa",
    contentLicenseUrl: "https://www.nasa.gov/nasa-brand-center/images-and-media/",
  },
] satisfies Array<ArticleSource & { defaultRegion: Region }>;

interface FictionalStory {
  slug: string;
  title: string;
  summary: string;
  category: CategorySlug;
  region: Region;
  hoursAgo: number;
  score: number;
  keywords: string[];
}

// These are deliberately fictional examples, never automatically ingested news.
const fictionalStories: FictionalStory[] = [
  {
    slug: DEMO_LEAD_SLUG,
    title: "Vesi palasi ennallistetulle kosteikolle",
    summary: "Entisen ojitetun kosteikon vedenpintaa on palautettu lähemmäs sen luontaista tasoa. Paikallinen kunnostusryhmä sulki tarpeettomia ojia ja rakensi kulkureitin, joka ohjaa vierailijat herkimpien alueiden ohi. Ensimmäisessä seurannassa vesi on viipynyt alueella aiempaa pidempään. Työ tarjoaa pohjan kosteikkokasvillisuuden palautumiselle, mutta luonnon elpymistä arvioidaan vasta usean vuoden seurannalla. Aluetta voi jo nyt tarkastella uuden reitin varrelta häiritsemättä kunnostuskohdetta.",
    category: "luonto", region: "Suomi", hoursAgo: 1, score: 99,
    keywords: ["kosteikko", "ennallistaminen", "vesi", "luonnonsuojelu"],
  },
  {
    slug: "demo-palvelubussi",
    title: "Palvelubussi toi asiointimatkat takaisin kylille",
    summary: "Kunnan uusi palvelubussi yhdistää sivukylät terveyskeskukseen, kirjastoon ja keskustan kauppoihin kahtena päivänä viikossa. Matkan voi varata puhelimitse, eikä palvelun käyttäminen edellytä älypuhelinta. Matalalattiaiseen autoon pääsee myös apuvälineen kanssa. Ensimmäinen toimintakausi on kokeilu, jonka aikana kerätään matkustajapalautetta ja tietoa reittien tarpeesta. Palvelu auttaa etenkin asukkaita, joilla ei ole omaa autoa tai mahdollisuutta käyttää tavallisia linja-autovuoroja.",
    category: "yhteiskunta", region: "Suomi", hoursAgo: 3, score: 86,
    keywords: ["joukkoliikenne", "saavutettavuus", "kylät"],
  },
  {
    slug: "demo-hylkeenpoikanen",
    title: "Hylkeenpoikanen palasi mereen hoitojakson jälkeen",
    summary: "Rannikolta löytynyt heikkokuntoinen hylkeenpoikanen on palautettu mereen eläinten kuntoutuskeskuksesta. Hoitajat seurasivat sen vointia ja varmistivat ennen vapautusta, että se pystyy syömään ja liikkumaan itsenäisesti. Vapautuspaikka valittiin alueen luontaisten olosuhteiden perusteella. Keskus muistuttaa, ettei rannalla lepäävä hylje aina tarvitse apua. Eläimen tilanne kannattaa arvioida yhdessä paikallisen asiantuntijan kanssa ja pitää siihen riittävä etäisyys.",
    category: "elaimet", region: "Maailmalta", hoursAgo: 5, score: 76,
    keywords: ["hylje", "kuntoutus", "poikanen", "eläintenhoito"],
  },
  {
    slug: "demo-lukemisen-opastus",
    title: "Kirjaston uusi palvelu kokoaa äänikirjojen, pistekirjoituksen ja helppolukuisten kirjojen opastuksen saman pöydän ääreen",
    summary: "Kirjastossa on alkanut viikoittainen neuvonta, jossa etsitään kullekin lukijalle sopivaa tapaa käyttää kirjallisuutta. Opastusta saa äänikirjoihin, suurikokoiseen tekstiin, pistekirjoitukseen ja helppolukuisiin teoksiin. Käynnille ei tarvita ajanvarausta, ja oman laitteen voi ottaa mukaan. Palvelu on suunniteltu yhdessä eri tavoin lukevien asukkaiden kanssa. Tavoitteena on tehdä olemassa olevista aineistoista helpommin löydettäviä myös niille, joille tavallisen painetun kirjan lukeminen on vaikeaa.",
    category: "kulttuuri-ja-oppiminen", region: "Suomi", hoursAgo: 8, score: 79,
    keywords: ["kirjasto", "lukeminen", "pistekirjoitus", "äänikirjat"],
  },
  {
    slug: "demo-kuntoutusauto",
    title: "Liikkuva kuntoutuspalvelu tavoitti syrjäseudun asukkaita",
    summary: "Alueellinen terveyspalvelu on aloittanut liikkuvan vastaanoton, joka vie fysioterapeutin ja kuntoutusohjaajan pieniin taajamiin. Asiakkaat saavat yksilöllisen arvion ja ohjeet jatkosta lähellä kotiaan. Palvelu täydentää tavallisia vastaanottoja, eikä korvaa tutkimuksia tai hoitoa, jotka edellyttävät sairaalan välineitä. Kokeilussa seurataan palvelun käyttöä ja sitä, helpottuuko sovituille käynneille pääsy. Ensimmäiset vastaanotot ovat täyttyneet aiemmin pitkän matkan päässä asuneista asiakkaista.",
    category: "terveys", region: "Maailmalta", hoursAgo: 11, score: 72,
    keywords: ["kuntoutus", "fysioterapia", "palvelut"],
  },
  {
    slug: "demo-korjauspaja",
    title: "Naapuruston korjauspajassa tavara sai lisää käyttöaikaa",
    summary: "Vapaaehtoisten ylläpitämä korjauspaja avasi ovensa asukastalon yhteydessä. Ensimmäisellä kerralla kunnostettiin vaatteita, polkupyöriä ja pieniä kodin esineitä yhdessä niiden omistajien kanssa. Työkalut ja työpöydät ovat yhteisessä käytössä, ja kokeneemmat osallistujat neuvovat aloittelijoita. Sähkölaitteiden korjaus jätetään ammattilaisille. Paja kokoontuu kerran kuussa, ja mukaan voi tulla myös oppimaan taitoja tai auttamaan järjestelyissä ilman omaa korjattavaa tavaraa.",
    category: "ihmiset-ja-yhteisot", region: "Suomi", hoursAgo: 15, score: 73,
    keywords: ["vapaaehtoiset", "korjaaminen", "naapurusto", "yhteisö"],
  },
  {
    slug: "demo-joen-uoma",
    title: "Joki sai takaisin vanhan uomansa",
    summary: "Joen kunnostuksessa on avattu vuosikymmeniä sitten suljettu sivu-uoma ja palautettu veden yhteys tulvaniitylle. Työ tehtiin maanomistajien, kunnan ja vesistöasiantuntijoiden yhteistyönä. Rakenteiden poistaminen antaa vedelle enemmän tilaa runsaan sateen aikana ja monipuolistaa joen elinympäristöjä. Hankkeen vaikutuksia veden laatuun ja kasvillisuuteen seurataan tulevina vuosina. Rannan kävelyreitti säilyy käytössä, mutta herkimmät istutusalueet on rajattu toistaiseksi kulkemisen ulkopuolelle.",
    category: "luonto", region: "Maailmalta", hoursAgo: 20, score: 78,
    keywords: ["joki", "vesistö", "ennallistaminen", "tulvaniitty"],
  },
  {
    slug: "demo-kissanpennut",
    title: "Kissanpennut löysivät kodin yhdessä",
    summary: "Eläinsuojeluyhdistyksen hoidossa varttuneet kaksi kissanpentua ovat muuttaneet samaan kotiin. Sijaiskoti oli huomannut pentujen viihtyvän tiiviisti yhdessä, ja yhdistys etsi niille perhettä, joka voisi ottaa molemmat. Ennen muuttoa eläinlääkäri tarkasti pentujen voinnin ja uusien omistajien kanssa käytiin läpi niiden tarpeet. Yhdistys seuraa kotiutumista sovituilla yhteydenotoilla. Pieni uutinen muistuttaa myös sijaiskotien merkityksestä kodittomien eläinten hoidossa.",
    category: "elaimet", region: "Suomi", hoursAgo: 23, score: 70,
    keywords: ["kissa", "kissanpennut", "adoptio", "sijaiskoti"],
  },
  {
    slug: "demo-kohokartta",
    title: "Kohokartta auttaa hahmottamaan aseman tilat",
    summary: "Tutkimusryhmä ja näkövammaiset käyttäjät ovat testanneet uutta kohokarttaa paikallisella liikenneasemalla. Kartan tunnusteltavat reitit ja selkeä ääniohje auttavat selvittämään, mistä laiturille ja palvelupisteisiin kuljetaan. Käyttäjätestien perusteella kartan merkintöjä yksinkertaistettiin ennen seuraavaa kokeilua. Ratkaisu on vielä kehitysvaiheessa, eikä se korvaa henkilökunnan apua tai muita opasteita. Työssä kerätty palaute on tarkoitus huomioida myös aseman myöhemmissä opasteuudistuksissa.",
    category: "tiede-ja-teknologia", region: "Suomi", hoursAgo: 27, score: 71,
    keywords: ["kohokartta", "saavutettavuus", "tutkimus", "asema"],
  },
  {
    slug: "demo-julkiset-asiakirjat",
    title: "Julkiset päätökset löytyvät nyt yhdestä saavutettavasta palvelusta",
    summary: "Kaupunki on avannut palvelun, joka kokoaa valtuuston ja lautakuntien päätökset samaan hakunäkymään. Asiakirjoja voi etsiä aiheella ja päivämäärällä, ja keskeiset tiedot ovat luettavissa myös ruudunlukijalla. Aiemmin aineisto oli hajallaan useilla verkkosivuilla. Palvelu kattaa aluksi kuluvan vuoden päätökset, joten vanhempia asiakirjoja haetaan vielä arkistosta. Käyttäjiltä kerätään palautetta erityisesti hakutoiminnon ymmärrettävyydestä ja asiakirjojen löydettävyydestä.",
    category: "yhteiskunta", region: "Maailmalta", hoursAgo: 32, score: 65,
    keywords: ["avoimuus", "päätökset", "saavutettavuus", "julkinen hallinto"],
  },
  {
    slug: "demo-yhteinen-keittio",
    title: "Yhteinen keittiö toi uusia naapureita saman pöydän ääreen",
    summary: "Asukasyhdistys avasi kerrostaloalueelle yhteisen keittiövuoron, jossa naapurit valmistavat ruokaa ja tutustuvat toisiinsa. Toimintaan voi osallistua ilman aiempaa ruoanlaittokokemusta. Järjestäjät huolehtivat raaka-aineiden tiedoista ja kertovat allergeeneista etukäteen. Ensimmäiset vuorot suunniteltiin yhdessä alueen asukkaiden kanssa, ja tarjolla on myös rauhallisempi osallistumismahdollisuus. Keittiö toimii aluksi kerran viikossa, ja jatkosta päätetään osallistujien palautteen sekä käytettävissä olevien voimavarojen perusteella.",
    category: "ihmiset-ja-yhteisot", region: "Maailmalta", hoursAgo: 37, score: 64,
    keywords: ["naapurit", "yhteisö", "ruoanlaitto", "asukasyhdistys"],
  },
  {
    slug: "demo-museon-opastus",
    title: "Museo aloitti säännölliset viittomakieliset opastukset",
    summary: "Kaupunginmuseo on lisännyt ohjelmaansa viittomakieliset näyttelykierrokset yhteistyössä paikallisen yhdistyksen kanssa. Opastus käsittelee museon pysyvää kokoelmaa, ja osallistujat voivat esittää kysymyksiä omalla kielellään. Ensimmäisen kierroksen palautetta käytetään aikataulun ja reitin kehittämiseen. Museossa on jo tekstimuotoisia aineistoja, mutta uusi palvelu tarjoaa mahdollisuuden yhteiseen keskusteluun. Kierroksille on tavallinen museon pääsymaksu, eikä viittomakielisestä opastuksesta peritä erillistä lisämaksua.",
    category: "kulttuuri-ja-oppiminen", region: "Maailmalta", hoursAgo: 44, score: 63,
    keywords: ["museo", "viittomakieli", "opastus", "kulttuuri"],
  },
  {
    slug: "demo-puheterapia",
    title: "Puheterapian etäkäynnit helpottivat pitkien matkojen arkea",
    summary: "Alueen puheterapiapalvelussa on kokeiltu etäkäyntejä asiakkaille, joille ne sopivat yksilöllisen arvion perusteella. Vastaanoton voi yhdistää lähikäynteihin, ja tarvittaessa laitteiden käyttöön saa opastusta. Kokeiluun osallistuneet perheet ovat säästäneet matkustusaikaa, mutta hoidon vaikutuksia arvioidaan erikseen. Kaikkia tutkimuksia tai harjoitteita ei voi toteuttaa etänä. Palvelun jatkossa painotetaan asiakkaan tilannetta ja sitä, että myös tavallinen vastaanotto pysyy saatavilla.",
    category: "terveys", region: "Suomi", hoursAgo: 50, score: 66,
    keywords: ["puheterapia", "etävastaanotto", "kuntoutus", "perheet"],
  },
  {
    slug: "demo-kultapandan-poikaset",
    title: "Kultapandan poikaset ottavat ensiaskeleitaan",
    summary: "Eläintarhan kaksi kultapandan poikasta ovat alkaneet tutkia pesän ympäristöä emonsa seurassa. Hoitajat seuraavat niiden kasvua etäältä ja rajaavat vierailijoiden pääsyä pesän lähelle. Pennut saavat vielä suuren osan ravinnostaan emoltaan, joten ne viettävät paljon aikaa suojassa. Tarha osallistuu lajin koordinoituun suojeluohjelmaan. Syntymä on pieni myönteinen tapahtuma, mutta yksittäiset poikaset eivät yksin muuta luonnonvaraisen lajin suojelutilannetta.",
    category: "elaimet", region: "Maailmalta", hoursAgo: 59, score: 62,
    keywords: ["kultapanda", "poikaset", "eläintarha", "söpöt eläimet"],
  },
  {
    slug: "demo-niityn-kasvit",
    title: "Hoitoniitylle palasi useita niittykasveja",
    summary: "Kylän yhteisellä niityllä on havaittu useita kasvilajeja, joita ei löydetty kunnostusta edeltäneessä kartoituksessa. Aluetta on niitetty loppukesällä, ja niittojäte on kerätty pois maaperän rehevöitymisen vähentämiseksi. Havainnot kirjattiin samoilta seurantaruuduilta kuin aiempina vuosina. Yhden kesän tulokset eivät vielä kerro pysyvästä muutoksesta, mutta ne antavat syyn jatkaa hoitoa. Niitty on avoin ulkoilijoille merkittyjen polkujen kautta.",
    category: "luonto", region: "Suomi", hoursAgo: 68, score: 61,
    keywords: ["niitty", "kasvit", "luonnonhoito", "seuranta"],
  },
  {
    slug: "demo-esineiden-kuvantaminen",
    title: "Uusi kuvantamismenetelmä tutkii hauraita esineitä koskematta niihin",
    summary: "Tutkijat ovat kokeilleet menetelmää, jolla museoesineen pinnan pienet muutokset voidaan dokumentoida ilman näytteen ottamista. Kokeessa eri valaistuksilla otetut kuvat yhdistettiin tarkaksi malliksi. Konservaattorit vertasivat tuloksia aiempiin havaintoihinsa ja löysivät mallista samoja vaurioalueita. Menetelmä tarvitsee vielä lisää testausta erilaisten materiaalien kanssa. Onnistuessaan se voi helpottaa esineiden kunnon seurantaa tilanteissa, joissa niiden siirtämistä tai käsittelyä halutaan välttää.",
    category: "tiede-ja-teknologia", region: "Maailmalta", hoursAgo: 79, score: 60,
    keywords: ["kuvantaminen", "tutkimus", "konservointi", "museo"],
  },
  {
    slug: "demo-siemenkirjasto",
    title: "Siemenkirjasto innostaa oppimaan kasvattamisesta",
    summary: "Kirjasto avasi siementen vaihtopisteen ja siihen liittyvän maksuttoman opastussarjan. Asukkaat voivat tuoda omasta sadostaan kerättyjä siemeniä, kun laji ja keräysaika ovat tiedossa. Vieraslajien ja tuntemattomien siementen jakamista ei sallita. Opastus käsittelee myös kasvien tunnistamista ja pienen tilan viljelyä. Toiminta on aluksi kokeilu, jossa tärkeintä on taitojen jakaminen. Kirjaston tavallinen puutarhakirjallisuus on koottu vaihtopisteen lähelle helpottamaan lisätiedon etsimistä.",
    category: "kulttuuri-ja-oppiminen", region: "Suomi", hoursAgo: 94, score: 57,
    keywords: ["siemenkirjasto", "oppiminen", "puutarha", "kirjasto"],
  },
  {
    slug: "demo-koulureitti",
    title: "Koulureitin risteys muutettiin helpommin ylitettäväksi",
    summary: "Koulun lähellä sijaitsevan risteyksen suojatietä on korotettu ja odotusalueita levennetty. Muutosta valmisteltiin lasten, huoltajien ja liikennesuunnittelijoiden yhteisellä kävelykierroksella. Uudet järjestelyt lyhentävät ajoradan ylitysmatkaa ja parantavat näkyvyyttä. Nopeuksia ja liikenteen sujumista seurataan lukukauden aikana, joten turvallisuusvaikutuksista ei vielä ole pidemmän ajan tietoa. Koulu käy uuden reitin läpi oppilaiden kanssa osana tavallista liikennekasvatusta.",
    category: "yhteiskunta", region: "Suomi", hoursAgo: 117, score: 58,
    keywords: ["koulumatka", "liikenneturvallisuus", "suojatie", "lapset"],
  },
  {
    slug: "demo-yhteisopuutarha",
    title: "Yhteisöpuutarhan ensimmäinen sato jaettiin yhdessä",
    summary: "Palvelutalon asukkaat ja lähikoulun oppilaat korjasivat yhteisen puutarhan ensimmäisen sadon. Viljelylaatikot rakennettiin korkeuksille, joiden ääreen pääsee myös pyörätuolilla. Ryhmä on hoitanut kasveja viikoittain ja kirjannut, mitkä lajikkeet menestyvät pienellä pihalla. Sato käytettiin yhteisellä ruoanlaittokerralla. Puutarhan tärkeä osa on säännöllinen tekeminen eri-ikäisten ihmisten kesken, ja seuraavan kauden suunnitelmat tehdään osallistujien toiveiden pohjalta.",
    category: "ihmiset-ja-yhteisot", region: "Suomi", hoursAgo: 145, score: 56,
    keywords: ["puutarha", "sukupolvet", "yhteisö", "palvelutalo"],
  },
  {
    slug: "demo-terveysneuvonta",
    title: "Terveysneuvontaa saa nyt myös iltaisin",
    summary: "Paikallinen terveysasema on lisännyt ajanvarauksetonta neuvontaa kahteen arki-iltaan. Hoitaja arvioi asiakkaan tilanteen ja ohjaa tarvittaessa jatkotutkimuksiin tai muuhun palveluun. Uusi aika palvelee erityisesti ihmisiä, joiden on vaikea irrottautua työstä päiväsaikaan. Kyseessä ei ole päivystys, ja kiireelliset tilanteet hoidetaan edelleen alueen normaalien ohjeiden mukaisesti. Kokeilun käyttöä seurataan ennen päätöstä mahdollisesta pysyvästä iltavastaanotosta.",
    category: "terveys", region: "Maailmalta", hoursAgo: 193, score: 54,
    keywords: ["terveysasema", "neuvonta", "saavutettavuus", "vastaanotto"],
  },
  {
    slug: "demo-avustajakoira",
    title: "Avustajakoira aloitti arjen uuden käyttäjänsä kanssa",
    summary: "Koulutettu avustajakoira on muuttanut käyttäjänsä luokse yhteisen harjoittelujakson jälkeen. Koira osaa noutaa pieniä esineitä ja auttaa arjen tehtävissä käyttäjän yksilöllisten tarpeiden mukaan. Kouluttaja jatkaa parin tukemista kotikäynneillä, jotta opitut taidot siirtyvät tavallisiin tilanteisiin. Myös koiran lepo, terveys ja vapaa-aika kuuluvat suunnitelmaan. Uuden yhteistyön vakiintuminen vie aikaa, ja tehtäviä lisätään vasta sen edetessä.",
    category: "elaimet", region: "Suomi", hoursAgo: 242, score: 53,
    keywords: ["koira", "avustajakoira", "koulutus", "arki"],
  },
  {
    slug: "demo-rannikon-kosteikko",
    title: "Vuorovesi pääsee jälleen rannikon kosteikolle",
    summary: "Rannikon kunnostushankkeessa on avattu vanhan penkereen sulkemia yhteyksiä mereen. Vuorovesi kulkee nyt takaisin osaan kosteikkoa, jonka kasvillisuus oli muuttunut veden vaihtumisen heikennyttyä. Työ toteutettiin vaiheittain, jotta lähialueen vedenpintoja voitiin seurata. Ensimmäiset mittaukset osoittavat veden vaihtuvan suunnitellusti, mutta kasvillisuuden palautumisesta tarvitaan pidempi seuranta. Alueen yleinen kulkureitti siirrettiin kunnostuksen yhteydessä kuivemmalle maalle.",
    category: "luonto", region: "Maailmalta", hoursAgo: 410, score: 51,
    keywords: ["rannikko", "kosteikko", "vuorovesi", "ennallistaminen"],
  },
  {
    slug: "demo-koira-kotiin",
    title: "Kadonnut koira löytyi tunnistusmerkinnän avulla",
    summary: "Eläinsuojelukeskukseen tuotu iäkäs koira on palannut omistajansa luokse. Keskuksen työntekijä tarkisti koiran mikrosirun ja tavoitti rekisteriin merkityn yhteyshenkilön. Eläinlääkäri arvioi koiran voinnin ennen kotiinlähtöä. Omistaja oli etsinyt sitä katoamispäivästä lähtien ja pystyi vahvistamaan tarvittavat tiedot. Tapaus havainnollistaa, miksi lemmikin tunnistusmerkintä ja ajan tasalla olevat yhteystiedot ovat hyödyllisiä myös tutussa ympäristössä liikkuvalle eläimelle.",
    category: "elaimet", region: "Maailmalta", hoursAgo: 820, score: 49,
    keywords: ["koira", "löytöeläin", "mikrosiru", "jälleennäkeminen"],
  },
];

export function createDemoArticles(now = new Date()): Article[] {
  const articles = fictionalStories.map((story): Article => {
    const date = new Date(now.getTime() - story.hoursAgo * 3_600_000).toISOString();
    const source = demoSources[story.region === "Suomi" ? 0 : 1];
    return {
      id: story.slug,
      slug: story.slug,
      titleFi: story.title,
      summaryFi: story.summary,
      primaryCategory: story.category,
      region: story.region,
      source,
      canonicalUrl: `https://example.org/kehitysaineisto/${story.slug}`,
      originalTitle: story.title,
      sourcePublishedAt: date,
      publishedAt: date,
      rankingScore: story.score,
      isFixture: true,
      keywords: story.keywords,
      image: null,
    };
  });

  // This one manually verified real story demonstrates exact, cleared editorial imagery.
  articles.push({
    id: DEMO_IMAGE_SLUG,
    slug: DEMO_IMAGE_SLUG,
    titleFi: "Roman-avaruusteleskooppi siirrettiin laukaisua valmistelevaan halliin",
    summaryFi: "NASAn Nancy Grace Roman -avaruusteleskooppi kuljetettiin 25. elokuuta 2026 Kennedyn avaruuskeskuksessa SpaceX:n halliin. Teleskooppi oli kuljetuksen aikana hyötykuormasuojuksen sisällä. Seuraava valmisteluvaihe oli liittäminen Falcon Heavy -kantorakettiin. Romanin on tarkoitus tutkia muun muassa pimeää energiaa ja galaksien kehitystä. NASAn julkaisun aikaan laukaisua tavoiteltiin aikaisintaan 30. elokuuta. Siirto oli siis valmisteluvaihe, eikä teleskooppia ollut tämän uutisen mukaan vielä laukaistu.",
    primaryCategory: "tiede-ja-teknologia",
    region: "Maailmalta",
    source: demoSources[2],
    canonicalUrl: DEMO_NASA_URL,
    originalTitle: "Roman Space Telescope Travels to SpaceX Hangar",
    sourcePublishedAt: "2026-08-26T18:40:19.000Z",
    publishedAt: "2026-08-26T18:40:19.000Z",
    rankingScore: 89,
    isFixture: true,
    keywords: ["NASA", "Roman", "avaruusteleskooppi", "avaruus", "tiede"],
    image: {
      imageUrl: "/demo/roman-avaruusteleskooppi.jpg",
      imageAltFi: "Roman-avaruusteleskooppi hyötykuormasuojuksen sisällä kuljetusalustalla Kennedyn avaruuskeskuksessa yöllä.",
      imageCaptionFi: "Roman-avaruusteleskooppia kuljetetaan SpaceX:n halliin 25. elokuuta 2026.",
      imageCreator: "NASA/Sydney Rohde (Rocz)",
      imageSourceUrl: DEMO_NASA_URL,
      imageLicense: "NASAn toimituksellisen käytön lupa",
      imageLicenseUrl: "https://www.nasa.gov/nasa-brand-center/images-and-media/",
      imageRightsStatus: "approved",
      imageRelevanceConfirmed: true,
      imageRightsConfirmed: true,
      width: 1200,
      height: 800,
    },
  });

  return articles;
}
