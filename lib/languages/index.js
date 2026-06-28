/**
 * Sprach-Modul-Registry.
 *
 * Jede unterstützte Sprache (Deutsch, Englisch, Spanisch, Französisch...)
 * bekommt ein eigenes Modul. Alle Prompts, Topic-Pools und TTS-Konfigurationen
 * gehen durch das jeweilige Modul.
 *
 * Aktuell aktiv: nur Deutsch (de). Englisch/Spanisch/Französisch kommen später
 * – die Architektur ist vorbereitet (einfach Modul hinzufügen + hier registrieren).
 *
 * Verwendung im Server:
 *   const { getLanguage } = require('./lib/languages');
 *   const lang = getLanguage(profile.language || 'de');
 *   const text = lang.promptIntros.analyze; // sprach-spezifischer Prompt-Text
 */

const de = require('./de');

// Hier weitere Sprachen registrieren, sobald implementiert:
// const en = require('./en');
// const es = require('./es');
// const fr = require('./fr');

const LANGUAGES = {
  de,
  // en, es, fr,
};

const DEFAULT_LANGUAGE = 'de';

function getLanguage(code) {
  return LANGUAGES[code] || LANGUAGES[DEFAULT_LANGUAGE];
}

function listLanguages() {
  return Object.keys(LANGUAGES);
}

module.exports = { getLanguage, listLanguages, DEFAULT_LANGUAGE };
