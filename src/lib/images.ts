import type { ImageMetadata } from "./domain";

function validReference(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function canDisplayImage(image: ImageMetadata | null | undefined): image is ImageMetadata {
  if (!image || image.imageRightsStatus !== "approved" || !image.imageRelevanceConfirmed || !image.imageRightsConfirmed) return false;
  if (!image.imageAltFi.trim() || !image.imageCreator.trim() || !image.imageLicense.trim()) return false;
  if (/non.?commercial|(?:^|[\s-])nc(?:$|[\s-])/i.test(image.imageLicense)) return false;
  if (!validReference(image.imageSourceUrl) || !validReference(image.imageLicenseUrl)) return false;
  if (!/^\/(?:demo|media)\/[a-zA-Z0-9/_-]+\.(?:png|jpe?g|webp|svg)$/.test(image.imageUrl)) return false;
  return Number.isInteger(image.width) && image.width > 0 && Number.isInteger(image.height) && image.height > 0;
}
