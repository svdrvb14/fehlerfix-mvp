"use client";

const SHARE_TEXT =
  "Hol dir jetzt FehlerFix – die App, die Rechtschreibfehler direkt aus deiner Handschrift erkennt und dir erklärt, warum: https://fehlerfix.info";

export function ReferralShareButton() {
  async function handleShare() {
    // Auf dem Handy öffnet das direkt die native "An wen senden"-Auswahl
    // (WhatsApp, Nachrichten, Mail, ...) mit vorausgefülltem Text - genau
    // das "direkt eine Nachricht schicken" ohne Umweg über Copy&Paste.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: SHARE_TEXT });
        return;
      } catch {
        // Abgebrochen oder nicht verfügbar - auf WhatsApp-Web-Link ausweichen.
      }
    }
    // Desktop-Fallback: WhatsApp-Web-Freigabelink, öffnet den Chat-Auswahl-
    // Dialog mit demselben vorausgefüllten Text.
    window.open(
      `https://wa.me/?text=${encodeURIComponent(SHARE_TEXT)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="mt-4 inline-flex items-center gap-2 rounded-full bg-coral px-6 py-3 text-center font-semibold text-white shadow-md transition duration-150 hover:bg-coral/90 active:scale-[0.97]"
    >
      📤 Freund einladen
    </button>
  );
}
