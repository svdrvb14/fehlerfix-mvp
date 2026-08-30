/**
 * Bild-Katalog für Übungen mit Bildern (z.B. "picture_sentence").
 *
 * WARUM ÜBERHAUPT EIN KATALOG STATT LIVE-BILD-GENERIERUNG: Live pro Übung
 * generierte Bilder sieht niemand, bevor ein Kind sie sieht – ein
 * misslungenes oder verwirrendes Bild würde direkt in einer Übung landen.
 * Stattdessen gibt es hier eine feste Liste fester Konzepte. Übungen dürfen
 * NUR Schlüssel aus dieser Liste verwenden, nie frei erfundene.
 *
 * AKTUELL: jeder Eintrag hat einen Emoji-Platzhalter (`placeholder`) als
 * Bild-Wert – kostenlos, sofort verfügbar, kein Generierungs-Risiko.
 * SPÄTER: sobald echte Illustrationen hochgeladen sind, trägt man die URL
 * bei `imageUrl` ein – `resolve()` bevorzugt sie automatisch gegenüber dem
 * Platzhalter. Übungen, Prompts und Frontend müssen dafür NICHT geändert
 * werden – nur diese eine Datei.
 */

const CATALOG = [
  // Tiere
  { key: 'loewe', label: 'Löwe', category: 'Tiere', placeholder: '🦁', imageUrl: null },
  { key: 'tiger', label: 'Tiger', category: 'Tiere', placeholder: '🐯', imageUrl: null },
  { key: 'elefant', label: 'Elefant', category: 'Tiere', placeholder: '🐘', imageUrl: null },
  { key: 'affe', label: 'Affe', category: 'Tiere', placeholder: '🐵', imageUrl: null },
  { key: 'giraffe', label: 'Giraffe', category: 'Tiere', placeholder: '🦒', imageUrl: null },
  { key: 'baer', label: 'Bär', category: 'Tiere', placeholder: '🐻', imageUrl: null },
  { key: 'fuchs', label: 'Fuchs', category: 'Tiere', placeholder: '🦊', imageUrl: null },
  { key: 'hase', label: 'Hase', category: 'Tiere', placeholder: '🐰', imageUrl: null },
  { key: 'igel', label: 'Igel', category: 'Tiere', placeholder: '🦔', imageUrl: null },
  { key: 'eule', label: 'Eule', category: 'Tiere', placeholder: '🦉', imageUrl: null },
  { key: 'hund', label: 'Hund', category: 'Tiere', placeholder: '🐶', imageUrl: null },
  { key: 'katze', label: 'Katze', category: 'Tiere', placeholder: '🐱', imageUrl: null },
  { key: 'pferd', label: 'Pferd', category: 'Tiere', placeholder: '🐴', imageUrl: null },
  { key: 'kuh', label: 'Kuh', category: 'Tiere', placeholder: '🐄', imageUrl: null },
  { key: 'schaf', label: 'Schaf', category: 'Tiere', placeholder: '🐑', imageUrl: null },
  { key: 'schwein', label: 'Schwein', category: 'Tiere', placeholder: '🐷', imageUrl: null },
  { key: 'huhn', label: 'Huhn', category: 'Tiere', placeholder: '🐔', imageUrl: null },
  { key: 'ente', label: 'Ente', category: 'Tiere', placeholder: '🦆', imageUrl: null },
  { key: 'fisch', label: 'Fisch', category: 'Tiere', placeholder: '🐟', imageUrl: null },
  { key: 'delfin', label: 'Delfin', category: 'Tiere', placeholder: '🐬', imageUrl: null },
  { key: 'schmetterling', label: 'Schmetterling', category: 'Tiere', placeholder: '🦋', imageUrl: null },
  { key: 'biene', label: 'Biene', category: 'Tiere', placeholder: '🐝', imageUrl: null },
  { key: 'spinne', label: 'Spinne', category: 'Tiere', placeholder: '🕷️', imageUrl: null },
  { key: 'schnecke', label: 'Schnecke', category: 'Tiere', placeholder: '🐌', imageUrl: null },
  { key: 'frosch', label: 'Frosch', category: 'Tiere', placeholder: '🐸', imageUrl: null },

  // Essen
  { key: 'apfel', label: 'Apfel', category: 'Essen', placeholder: '🍎', imageUrl: null },
  { key: 'banane', label: 'Banane', category: 'Essen', placeholder: '🍌', imageUrl: null },
  { key: 'birne', label: 'Birne', category: 'Essen', placeholder: '🍐', imageUrl: null },
  { key: 'erdbeere', label: 'Erdbeere', category: 'Essen', placeholder: '🍓', imageUrl: null },
  { key: 'kirsche', label: 'Kirsche', category: 'Essen', placeholder: '🍒', imageUrl: null },
  { key: 'brot', label: 'Brot', category: 'Essen', placeholder: '🍞', imageUrl: null },
  { key: 'kaese', label: 'Käse', category: 'Essen', placeholder: '🧀', imageUrl: null },
  { key: 'ei', label: 'Ei', category: 'Essen', placeholder: '🥚', imageUrl: null },
  { key: 'kuchen', label: 'Kuchen', category: 'Essen', placeholder: '🍰', imageUrl: null },
  { key: 'eis', label: 'Eis', category: 'Essen', placeholder: '🍦', imageUrl: null },
  { key: 'suppe', label: 'Suppe', category: 'Essen', placeholder: '🍲', imageUrl: null },
  { key: 'milch', label: 'Milch', category: 'Essen', placeholder: '🥛', imageUrl: null },

  // Fahrzeuge
  { key: 'auto', label: 'Auto', category: 'Fahrzeuge', placeholder: '🚗', imageUrl: null },
  { key: 'bus', label: 'Bus', category: 'Fahrzeuge', placeholder: '🚌', imageUrl: null },
  { key: 'zug', label: 'Zug', category: 'Fahrzeuge', placeholder: '🚂', imageUrl: null },
  { key: 'fahrrad', label: 'Fahrrad', category: 'Fahrzeuge', placeholder: '🚲', imageUrl: null },
  { key: 'flugzeug', label: 'Flugzeug', category: 'Fahrzeuge', placeholder: '✈️', imageUrl: null },
  { key: 'boot', label: 'Boot', category: 'Fahrzeuge', placeholder: '⛵', imageUrl: null },
  { key: 'feuerwehrauto', label: 'Feuerwehrauto', category: 'Fahrzeuge', placeholder: '🚒', imageUrl: null },

  // Wetter & Natur
  { key: 'sonne', label: 'Sonne', category: 'Wetter', placeholder: '☀️', imageUrl: null },
  { key: 'regen', label: 'Regen', category: 'Wetter', placeholder: '🌧️', imageUrl: null },
  { key: 'schnee', label: 'Schnee', category: 'Wetter', placeholder: '❄️', imageUrl: null },
  { key: 'wolke', label: 'Wolke', category: 'Wetter', placeholder: '☁️', imageUrl: null },
  { key: 'regenbogen', label: 'Regenbogen', category: 'Wetter', placeholder: '🌈', imageUrl: null },
  { key: 'baum', label: 'Baum', category: 'Natur', placeholder: '🌳', imageUrl: null },
  { key: 'blume', label: 'Blume', category: 'Natur', placeholder: '🌸', imageUrl: null },
  { key: 'berg', label: 'Berg', category: 'Natur', placeholder: '⛰️', imageUrl: null },
  { key: 'see', label: 'See', category: 'Natur', placeholder: '🏞️', imageUrl: null },
  { key: 'wald', label: 'Wald', category: 'Natur', placeholder: '🌲', imageUrl: null },

  // Schule & Alltag
  { key: 'buch', label: 'Buch', category: 'Schule', placeholder: '📖', imageUrl: null },
  { key: 'stift', label: 'Stift', category: 'Schule', placeholder: '✏️', imageUrl: null },
  { key: 'schere', label: 'Schere', category: 'Schule', placeholder: '✂️', imageUrl: null },
  { key: 'schulranzen', label: 'Schulranzen', category: 'Schule', placeholder: '🎒', imageUrl: null },
  { key: 'ball', label: 'Ball', category: 'Alltag', placeholder: '⚽', imageUrl: null },
  { key: 'haus', label: 'Haus', category: 'Alltag', placeholder: '🏠', imageUrl: null },
  { key: 'uhr', label: 'Uhr', category: 'Alltag', placeholder: '🕐', imageUrl: null },
  { key: 'schluessel', label: 'Schlüssel', category: 'Alltag', placeholder: '🔑', imageUrl: null },
  { key: 'brille', label: 'Brille', category: 'Alltag', placeholder: '👓', imageUrl: null },
  { key: 'schuh', label: 'Schuh', category: 'Alltag', placeholder: '👟', imageUrl: null },
  { key: 'muetze', label: 'Mütze', category: 'Alltag', placeholder: '🧢', imageUrl: null },
  { key: 'regenschirm', label: 'Regenschirm', category: 'Alltag', placeholder: '☂️', imageUrl: null },
];

const BY_KEY = Object.fromEntries(CATALOG.map((c) => [c.key, c]));

function catalog() {
  return CATALOG;
}

/** Für den Prompt: Schlüssel gruppiert nach Kategorie, ohne interne Felder. */
function keysForPrompt() {
  const byCategory = {};
  for (const c of CATALOG) {
    (byCategory[c.category] ||= []).push(`${c.key} (${c.label})`);
  }
  return Object.entries(byCategory)
    .map(([cat, items]) => `${cat}: ${items.join(', ')}`)
    .join('\n');
}

/** Löst einen Schlüssel zur Anzeige auf: echtes Bild, wenn vorhanden, sonst Emoji-Platzhalter. */
function resolve(key) {
  const entry = BY_KEY[key];
  if (!entry) return null;
  return {
    key: entry.key,
    label: entry.label,
    display: entry.imageUrl || entry.placeholder,
    isPlaceholder: !entry.imageUrl,
  };
}

module.exports = { catalog, keysForPrompt, resolve };
