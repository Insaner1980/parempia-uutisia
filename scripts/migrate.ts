import { getDatabase } from "../src/server/db";
import { loadLocalEnvironment } from "../src/server/env";
import { syncSources } from "../src/server/sources";

loadLocalEnvironment();
try {
  const database = getDatabase();
  try {
    syncSources(database);
    console.log(`Tietokanta valmis (${database.mode}).`);
  } finally {
    database.sqlite.close();
  }
} catch {
  console.error("Tietokannan alustus epäonnistui. Tarkista DATABASE_PATH ja demoasetukset.");
  process.exitCode = 1;
}
