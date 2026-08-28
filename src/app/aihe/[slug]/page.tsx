import { notFound } from "next/navigation";
import { ArticleList, PageHeading } from "@/components/ArticleList";
import { getCategory } from "@/lib/domain";
import { getArticles } from "@/server/queries";
import { metadataFor } from "@/lib/metadata";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();
  return metadataFor(category.label, category.description, `/aihe/${slug}`);
}
export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, { page }] = await Promise.all([params, searchParams]);
  const category = getCategory(slug);
  if (!category) notFound();
  const data = getArticles({ category: slug, page });
  return <><PageHeading title={category.label} description={category.description} count={data.total} /><ArticleList data={data} path={`/aihe/${slug}`} /></>;
}
