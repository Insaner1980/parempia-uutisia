import { basename, resolve } from "node:path";
import { createDemoArticles, demoSources } from "../fixtures/articles";
import { createDatabase } from "../src/server/db";
import { loadLocalEnvironment } from "../src/server/env";
import { seedFixtureArticles } from "../src/server/fixtures";

loadLocalEnvironment();

const databasePath = process.env.DATABASE_PATH;
if (process.env.DEMO_MODE !== "true" || !databasePath || basename(databasePath) !== "demo.sqlite") {
  throw new Error("Kehitysaineisto vaatii DEMO_MODE=true ja erikseen asetetun DATABASE_PATH-polun, jonka tiedostonimi on demo.sqlite.");
}
if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_PREVIEW !== "true") {
  throw new Error("Tuotantotilan demoesikatselu vaatii lisäksi ALLOW_DEMO_PREVIEW=true.");
}

const database = createDatabase(resolve(databasePath), { mode: "demo" });
try {
  const articles = createDemoArticles();
  seedFixtureArticles(database, articles, demoSources);
  console.log(`Kehitysaineisto valmis: ${articles.length} esimerkkijuttua. Kanta: ${databasePath}`);
} finally {
  database.sqlite.close();
}
