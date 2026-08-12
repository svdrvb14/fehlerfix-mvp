"use client";

import { useEffect } from "react";

// Wenn nach einem neuen Deployment ein Tab offen bleibt (oder ein alter
// Cache-Eintrag hängen bleibt), zeigen Next.js' inhaltsgehashte JS-Chunks
// unter alten URLs auf Dateien, die es serverseitig nicht mehr gibt - React
// hydratisiert dann gar nicht erst richtig, und die Seite bleibt komplett
// unreaktiv (z.B. Buttons ändern nichts mehr, Preise bleiben eingefroren).
// Statt dass Kundinnen und Kunden das als kaputte Seite erleben, einmalig
// automatisch neu laden, sobald so ein Chunk-Ladefehler auftritt.
const RELOAD_FLAG = "fehlerfix_stale_chunk_reload";

function looksLikeStaleChunkError(message: string): boolean {
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/i.test(
    message
  );
}

export function StaleChunkReload() {
  useEffect(() => {
    function reloadOnce(message: string) {
      if (!looksLikeStaleChunkError(message)) return;
      // Schutz vor einer Neuladeschleife, falls der Fehler nach dem Reload
      // erneut auftritt (z.B. wirklich fehlerhaftes Deployment).
      if (sessionStorage.getItem(RELOAD_FLAG)) return;
      sessionStorage.setItem(RELOAD_FLAG, "1");
      window.location.reload();
    }

    function handleError(event: ErrorEvent) {
      reloadOnce(event.message ?? "");
    }
    function handleRejection(event: PromiseRejectionEvent) {
      reloadOnce(String(event.reason?.message ?? event.reason ?? ""));
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
