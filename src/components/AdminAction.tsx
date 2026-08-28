"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminAction({ action, id, enabled, label, pendingLabel = "Tallennetaan", confirm, primary = false }: {
  action: "source" | "withdraw" | "ingest"; id?: string; enabled?: boolean; label: string; pendingLabel?: string; confirm?: string; primary?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  return <div>
    <form onSubmit={async (event) => {
      event.preventDefault();
      if (confirm && !window.confirm(confirm)) return;
      setPending(true);
      setMessage("");
      try {
        const data = new URLSearchParams({ action });
        if (id) data.set("id", id);
        if (enabled !== undefined) data.set("enabled", String(enabled));
        const response = await fetch("/api/hallinta/action", { method: "POST", body: data });
        const result = await response.json();
        setMessage(typeof result.message === "string" ? result.message : "Toimintoa ei voitu suorittaa.");
        router.refresh();
      } catch { setMessage("Yhteys katkesi. Tarkista ajon tila ennen uutta yritystä."); }
      finally { setPending(false); }
    }}>
      <button type="submit" className={primary ? "button" : "button button-secondary"} disabled={pending} aria-busy={pending}>{pending ? pendingLabel : label}</button>
    </form>
    <p role="status" aria-live="polite">{message}</p>
  </div>;
}
