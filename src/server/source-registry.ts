import type { Region, SourceRecord, SourceType } from "../lib/domain";

export interface JsonApiMapping {
  itemsPath: string;
  urlPath: string;
  titlePath: string;
  contentPath: string;
  datePath: string;
}

export interface SourceConfig {
  id: string;
  name: string;
  homepageUrl: string;
  feedUrl: string | null;
  language: string;
  defaultRegion: Region;
  enabled: boolean;
  trustLevel: SourceRecord["trustLevel"];
  sourceType: SourceType;
  fetchMethod: SourceRecord["fetchMethod"];
  allowedHosts: string[];
  articleExtractionAllowed: boolean;
  allowedArticlePathPrefixes?: string[];
  articleTextSelector?: string;
  imagesAllowed: boolean;
  imageReusePolicy: string;
  rateLimitMs: number;
  termsUrl: string | null;
  endpointVerifiedAt: string | null;
  verificationNotes: string;
  contentLicense?: string | null;
  contentLicenseUrl?: string | null;
  jsonApiMapping?: JsonApiMapping;
}

/** Only reviewed endpoints belong here. Admin controls can toggle, not add, URLs. */
export const SOURCE_REGISTRY: SourceConfig[] = [
  {
    id: "helsinki", name: "Helsingin kaupunki", homepageUrl: "https://www.hel.fi/fi",
    feedUrl: "https://www.hel.fi/fi/uutiset/rss", language: "fi", defaultRegion: "Suomi",
    enabled: true, trustLevel: "high", sourceType: "institution", fetchMethod: "rss",
    allowedHosts: ["www.hel.fi"], articleExtractionAllowed: true,
    allowedArticlePathPrefixes: ["/fi/uutiset/"],
    articleTextSelector: "article.node--type-news-article .component--paragraph-text .component__content.user-edited-content",
    imagesAllowed: false, imageReusePolicy: "Kuvia ei käytetä ilman erillistä, kuvaa koskevaa lupaa.",
    contentLicense: "CC BY 4.0", contentLicenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    rateLimitMs: 2000, termsUrl: "https://www.hel.fi/fi/paatoksenteko-ja-hallinto/tietoapalvelusta",
    endpointVerifiedAt: "2026-08-27",
    verificationNotes: "Syöte ja robots.txt vastasivat onnistuneesti 27.8.2026. Virallinen tietoa palvelusta -sivu dokumentoi RSS-syötteen ja tekstien CC BY 4.0 -lisenssin. Uutinen kertoo kaupungin omasta toiminnasta. Kuvien lupa tarkistetaan erikseen.",
  },
  {
    id: "nasa", name: "NASA", homepageUrl: "https://www.nasa.gov/", feedUrl: "https://www.nasa.gov/feed/",
    language: "en", defaultRegion: "Maailmalta", enabled: true, trustLevel: "high",
    sourceType: "institution", fetchMethod: "rss", allowedHosts: ["www.nasa.gov", "science.nasa.gov"],
    articleExtractionAllowed: false, imagesAllowed: false,
    imageReusePolicy: "Kuva hyväksytään vain tapahtumakohtaisen oikeustarkistuksen jälkeen. NASA-sivuilla on myös kolmansien osapuolten aineistoa.",
    rateLimitMs: 2000, termsUrl: "https://www.nasa.gov/nasa-brand-center/images-and-media/",
    endpointVerifiedAt: "2026-08-27",
    verificationNotes: "Virallinen RSS-luettelo osoittaa tähän syötteeseen. Syöte ja robots.txt vastasivat onnistuneesti 27.8.2026. Lähde kertoo omasta tutkimuksestaan. Syötteen teksti käsitellään väliaikaisesti, eikä sitä julkaista kokonaisena.",
  },
];
