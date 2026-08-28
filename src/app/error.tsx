"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section><h1>Sivua ei juuri nyt saada ladattua</h1><p>Yritä hetken kuluttua uudelleen. Uutislähteen tilapäinen häiriö ei poista jo julkaistuja uutisia.</p><button className="button" onClick={reset}>Yritä uudelleen</button></section>;
}
