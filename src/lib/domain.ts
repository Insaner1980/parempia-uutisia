export const CATEGORIES = [
  { slug: "elaimet", label: "Eläimet", description: "Eläinten elämää, toipumisia ja pieniäkin hyviä tapahtumia." },
  { slug: "luonto", label: "Luonto", description: "Ympäristön, elinympäristöjen ja luonnon hyväksi tapahtuvaa kehitystä." },
  { slug: "tiede-ja-teknologia", label: "Tiede ja teknologia", description: "Tutkimusta, keksintöjä ja hyödyllisiä ratkaisuja." },
  { slug: "terveys", label: "Terveys", description: "Terveyttä, hoitoa ja ihmisten toimintakykyä parantavia uutisia." },
  { slug: "ihmiset-ja-yhteisot", label: "Ihmiset ja yhteisöt", description: "Ihmisiä, auttamista ja yhdessä tehtyjä asioita." },
  { slug: "yhteiskunta", label: "Yhteiskunta", description: "Oikeuksia, palveluita ja yhteiskunnan myönteisiä muutoksia." },
  { slug: "kulttuuri-ja-oppiminen", label: "Kulttuuri ja oppiminen", description: "Koulutusta, kirjastoja, taidetta ja kulttuuriperintöä." },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
export type CategoryLabel = (typeof CATEGORIES)[number]["label"];
export type Region = "Suomi" | "Maailmalta";
export type SourceType = "independent" | "institution" | "organization";
export type ArticleStatus = "pending" | "published" | "rejected" | "withdrawn";

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  independent: "Riippumaton uutislähde",
  institution: "Viranomainen tai tutkimuslaitos",
  organization: "Organisaation oma uutinen",
};

export function getCategory(slug: string) {
  return CATEGORIES.find((category) => category.slug === slug);
}

export interface ImageMetadata {
  imageUrl: string;
  imageAltFi: string;
  imageCaptionFi: string;
  imageCreator: string;
  imageSourceUrl: string;
  imageLicense: string;
  imageLicenseUrl: string;
  imageRightsStatus: "approved" | "unknown" | "denied";
  imageRelevanceConfirmed: boolean;
  imageRightsConfirmed: boolean;
  width: number;
  height: number;
}

export interface ArticleSource {
  id: string;
  name: string;
  homepageUrl: string;
  sourceType: SourceType;
  contentLicense?: string | null;
  contentLicenseUrl?: string | null;
}

export interface Article {
  id: string;
  slug: string;
  titleFi: string;
  summaryFi: string;
  primaryCategory: CategorySlug;
  region: Region;
  source: ArticleSource;
  canonicalUrl: string;
  originalTitle: string;
  sourcePublishedAt: string;
  publishedAt: string;
  rankingScore: number;
  isFixture: boolean;
  keywords: string[];
  image: ImageMetadata | null;
}

export interface ArticleFilters {
  q?: string;
  region?: string;
  category?: string;
  source?: string;
  period?: string;
  sort?: string;
  page?: number | string;
  pageSize?: number;
}

export interface ArticlePage {
  items: Article[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SourceRecord extends ArticleSource {
  feedUrl: string | null;
  language: string;
  defaultRegion: Region;
  enabled: boolean;
  trustLevel: "high" | "medium" | "low";
  fetchMethod: "rss" | "json-feed" | "json-api";
  articleExtractionAllowed: boolean;
  imageReusePolicy: string;
  imagesAllowed: boolean;
  rateLimitMs: number;
  lastFetchedAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  verificationNotes: string;
  termsUrl: string | null;
  endpointVerifiedAt: string | null;
}

export interface IngestionReport {
  id: string;
  status: "running" | "completed" | "partial" | "failed" | "locked";
  startedAt: string;
  finishedAt: string | null;
  sourceCount: number;
  fetchedCount: number;
  candidateCount: number;
  publishedCount: number;
  rejectedCount: number;
  duplicateCount: number;
  errorCount: number;
  logSummary: string;
}
