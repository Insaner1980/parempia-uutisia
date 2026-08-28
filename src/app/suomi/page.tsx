import { ArticleList, PageHeading } from "@/components/ArticleList";
import { getArticles } from "@/server/queries";
import { metadataFor } from "@/lib/metadata";

export function generateMetadata() { return metadataFor("Suomi", "Hyviä uutisia suomalaisesta luonnosta, ihmisistä, tutkimuksesta ja yhteiskunnasta.", "/suomi"); }
export default async function FinlandPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  const data = getArticles({ region: "Suomi", page });
  return <><PageHeading title="Suomesta" description="Myönteisiä tapahtumia ja kehitystä läheltä." count={data.total} /><ArticleList data={data} path="/suomi" /></>;
}
