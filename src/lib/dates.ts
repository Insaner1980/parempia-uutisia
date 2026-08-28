export const PUBLIC_TIME_ZONE = "Europe/Helsinki";

export function formatFinnishDate(value: string | Date, options: { includeYear?: boolean } = {}): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "Päivämäärä ei ole tiedossa";
  return new Intl.DateTimeFormat("fi-FI", {
    day: "numeric",
    month: "long",
    ...(options.includeYear === false ? {} : { year: "numeric" as const }),
    timeZone: PUBLIC_TIME_ZONE,
  }).format(date);
}

export function formatFinnishDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "Päivämäärä ei ole tiedossa";
  return new Intl.DateTimeFormat("fi-FI", {
    day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: PUBLIC_TIME_ZONE,
  }).format(date);
}

/** Midnight in Helsinki, including daylight-saving transitions. */
export function startOfHelsinkiDay(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PUBLIC_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const utcMidnight = Date.UTC(get("year"), get("month") - 1, get("day"));
  const offsetParts = new Intl.DateTimeFormat("en", {
    timeZone: PUBLIC_TIME_ZONE, timeZoneName: "longOffset", hour: "2-digit",
  }).formatToParts(new Date(utcMidnight));
  const match = offsetParts.find((part) => part.type === "timeZoneName")?.value.match(/GMT([+-])(\d{2}):(\d{2})/);
  const offset = match ? (Number(match[2]) * 60 + Number(match[3])) * (match[1] === "+" ? 1 : -1) : 0;
  return new Date(utcMidnight - offset * 60_000);
}
