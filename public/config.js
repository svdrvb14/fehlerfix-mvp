/**
 * FehlerFix – Laufzeit-Konfiguration
 *
 * Wird VOR app.js geladen und legt fest, gegen welches Backend die App spricht.
 *
 *   Web  (auf dem Server ausgeliefert): apiBase = '' → gleiche Herkunft, relative Pfade
 *   Nativ (iOS/Android via Capacitor):  die Oberfläche liegt lokal im App-Bundle,
 *         das Backend aber im Netz → hier muss die absolute URL stehen.
 *
 * Beim Bauen der nativen App wird dieser Wert durch `npm run mobile:config`
 * gesetzt (siehe scripts/set-api-base.js).
 */
window.FF_CONFIG = {
  // Leer = gleiche Herkunft (Web). Für native Builds z.B. 'https://fehlerfix.onrender.com'
  apiBase: 'https://fehlerfix.onrender.com',
};

// Läuft die App in der nativen Hülle (Capacitor) statt im Browser?
window.FF_IS_NATIVE = Boolean(
  window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()
);
