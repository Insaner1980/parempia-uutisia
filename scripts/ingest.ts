import { getDatabase } from "../src/server/db";
import { loadLocalEnvironment } from "../src/server/env";
import { runDemoIngestion, runIngestion } from "../src/server/ingest";

loadLocalEnvironment();
try {
  const database = getDatabase();
  try {
    const result = database.mode === "demo" ? await runDemoIngestion(database) : await runIngestion({ database });
    console.log(`Uutishaku: ${result.status}. Haettu ${result.fetchedCount}, julkaistu ${result.publishedCount}, hylätty ${result.rejectedCount}, kaksoiskappaleita ${result.duplicateCount}, virheitä ${result.errorCount}.`);
    console.log(result.logSummary);
    if (result.status === "failed" || result.status === "partial" || result.status === "locked") process.exitCode = 1;
  } finally {
    database.sqlite.close();
  }
} catch {
  console.error("Uutishakua ei voitu aloittaa. Tarkista ympäristöasetukset ja tietokanta.");
  process.exitCode = 1;
}
