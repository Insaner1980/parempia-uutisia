import type { Metadata } from "next";
import { News_Cycle } from "next/font/google";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { isIndexable, siteBase, SITE_DESCRIPTION, SITE_NAME } from "@/lib/metadata";
import { THEME_BOOTSTRAP } from "@/lib/theme";
import "./globals.css";

const newsCycle = News_Cycle({
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
  display: "optional",
  variable: "--font-news-cycle",
});

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return {
    metadataBase: siteBase(),
    title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    robots: { index: isIndexable(), follow: isIndexable() },
    openGraph: { title: SITE_NAME, description: SITE_DESCRIPTION, siteName: SITE_NAME, locale: "fi_FI", type: "website" },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fi" className={newsCycle.variable} suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} /></head>
    <body>
      <a href="#sisalto" className="skip-link">Siirry sisältöön</a>
      {process.env.DEMO_MODE === "true" && <p className="demo-notice">
        Esittelytila. Uutiset ovat kehitysesimerkkejä, eivät ajankohtainen uutisjulkaisu.{" "}
        <Link href="/miten-tama-toimii#esittelytila">Tietoa esittelytilasta</Link>
      </p>}
      <Header />
      <main id="sisalto" tabIndex={-1} className="page-container">{children}</main>
      <Footer />
    </body>
  </html>;
}
