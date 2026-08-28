const FORBIDDEN_PUNCTUATION = /[\u00b7\u2022\u2219\u2014\u2013]/g;

/** Public text is plain text. Source markup is stripped on the server. */
export function normalizePublicText(value: string): string {
  return value
    .normalize("NFC")
    .replace(FORBIDDEN_PUNCTUATION, ", ")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/,{2,}/g, ",")
    .trim();
}

export function normalizeForSearch(value: string): string {
  return normalizePublicText(value)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("fi-FI")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function createSlug(title: string, id: string): string {
  const titlePart = normalizeForSearch(title).replace(/\s+/g, "-").slice(0, 90).replace(/-+$/, "");
  return `${titlePart || "uutinen"}-${id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toLowerCase()}`;
}
