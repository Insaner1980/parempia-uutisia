"use client";

import Image from "next/image";
import { useState } from "react";
import type { ImageMetadata } from "@/lib/domain";
import { canDisplayImage } from "@/lib/images";
import { normalizePublicText } from "@/lib/text";
import styles from "./Story.module.css";

export function ApprovedImage({ image, priority = false, compact = false }: { image: ImageMetadata | null; priority?: boolean; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed || !canDisplayImage(image)) return null;
  return <figure className={styles.figure}>
    <Image src={image.imageUrl} alt={normalizePublicText(image.imageAltFi)} width={image.width} height={image.height}
      sizes={compact ? "(max-width: 700px) 100vw, 420px" : "(max-width: 700px) 100vw, 840px"}
      preload={priority} onError={() => setFailed(true)} className={styles.image} />
    <figcaption className={styles.caption}>
      {!compact && image.imageCaptionFi && <span>{normalizePublicText(image.imageCaptionFi)} </span>}
      <span>Kuva: {normalizePublicText(image.imageCreator)}. </span>
      <a href={image.imageLicenseUrl} rel="external noopener noreferrer">{normalizePublicText(image.imageLicense)}</a>
      {!compact && <>{" "}<a href={image.imageSourceUrl} rel="external noopener noreferrer">Kuvan alkuperä</a></>}
    </figcaption>
  </figure>;
}
