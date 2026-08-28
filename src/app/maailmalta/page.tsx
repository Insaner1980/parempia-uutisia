import { ArticleList, PageHeading } from "@/components/ArticleList";
import { getArticles } from "@/server/queries";
import { metadataFor } from "@/lib/metadata";

export function generateMetadata() { return metadataFor("Maailmalta", "Myönteisiä uutisia eri puolilta maailmaa, tiivistettynä suomeksi.", "/maailmalta"); }
export default async function WorldPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  const data = getArticles({ region: "Maailmalta", page });
  return <><PageHeading title="Maailmalta" description="Hyviä uutisia eri puolilta maailmaa, suomeksi." count={data.total} /><ArticleList data={data} path="/maailmalta" /></>;
}
