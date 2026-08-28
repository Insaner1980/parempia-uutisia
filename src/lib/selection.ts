import type { Article } from "./domain";

export function selectFrontPage(articles: Article[]) {
  const used = new Set<string>();
  const take = (count: number, predicate: (article: Article) => boolean = () => true) => {
    const selected: Article[] = [];
    for (const article of articles) {
      if (selected.length === count) break;
      if (used.has(article.id) || !predicate(article)) continue;
      used.add(article.id);
      selected.push(article);
    }
    return selected;
  };
  const lead = take(1)[0] ?? null;
  const secondary: Article[] = [];
  const selectedCategories = new Set(lead ? [lead.primaryCategory] : []);
  for (const article of articles) {
    if (secondary.length === 4) break;
    if (used.has(article.id) || selectedCategories.has(article.primaryCategory)) continue;
    secondary.push(article);
    used.add(article.id);
    selectedCategories.add(article.primaryCategory);
  }
  secondary.push(...take(4 - secondary.length));
  const suomi = take(3, (article) => article.region === "Suomi");
  const maailmalta = take(3, (article) => article.region === "Maailmalta");
  const animals = take(3, (article) => article.primaryCategory === "elaimet");
  const latest: Article[] = [];
  for (const article of [...articles].sort((a, b) => b.sourcePublishedAt.localeCompare(a.sourcePublishedAt))) {
    if (used.has(article.id)) continue;
    latest.push(article);
    used.add(article.id);
    if (latest.length === 6) break;
  }
  return { lead, secondary, suomi, maailmalta, animals, latest };
}
