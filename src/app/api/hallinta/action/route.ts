import { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, isSameOrigin, verifyAdminToken } from "@/server/auth";
import { setSourceEnabled, withdrawArticle } from "@/server/queries";
import { runDemoIngestion, runIngestion } from "@/server/ingest";
import { adminResponse, readAdminForm } from "../request";

export const maxDuration = 600;

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request) || !verifyAdminToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value)) return adminResponse("Kirjaudu hallintaan ja yritä uudelleen.", 403);
  try {
    const form = await readAdminForm(request);
    const action = form.get("action");
    const id = form.get("id") || "";
    if (action === "source") {
      if (!["true", "false"].includes(form.get("enabled") || "")) return adminResponse("Virheellinen lähdeasetus.", 400);
      const updated = setSourceEnabled(id, form.get("enabled") === "true");
      return adminResponse(updated ? "Lähteen asetus tallennettiin." : "Lähdettä ei voida ottaa käyttöön ilman varmennettua syötettä.", updated ? 200 : 400);
    }
    if (action === "withdraw") {
      const updated = withdrawArticle(id);
      return adminResponse(updated ? "Uutinen poistettiin julkaisusta." : "Julkaistua uutista ei löytynyt.", updated ? 200 : 404);
    }
    if (action === "ingest") {
      const report = await (process.env.DEMO_MODE === "true" ? runDemoIngestion() : runIngestion());
      return adminResponse(report.logSummary, report.status === "locked" ? 409 : report.status === "failed" ? 503 : 200);
    }
    return adminResponse("Tuntematon toiminto.", 400);
  } catch { return adminResponse("Toiminto ei onnistunut. Tarkista asetukset ja yritä uudelleen.", 500); }
}
