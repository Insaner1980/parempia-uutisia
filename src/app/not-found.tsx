import Link from "next/link";
import { PageHeading } from "@/components/ArticleList";

export default function NotFound() {
  return <><PageHeading title="Sivua ei löytynyt" description="Osoite voi olla vanhentunut tai uutinen on poistettu julkaisusta." /><Link className="text-link" href="/">Palaa etusivulle →</Link></>;
}
