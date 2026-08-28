import { ArticleList, PageHeading } from "@/components/ArticleList";
import { getArticles } from "@/server/queries";
import { metadataFor } from "@/lib/metadata";

export function generateMetadata() { return metadataFor("Uusimmat", "Kaikki julkaistut uutistiivistelmät, uusimmasta alkaen.", "/uusimmat"); }
export default async function LatestPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  const data = getArticles({ page });
  return <><PageHeading title="Uusimmat" description="Kaikki uutiset, uusimmasta alkaen." count={data.total} /><ArticleList data={data} path="/uusimmat" /></>;
}
