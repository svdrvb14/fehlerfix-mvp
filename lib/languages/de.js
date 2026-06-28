/**
 * Sprach-Modul: Deutsch.
 *
 * Enthält alles, was sprach-spezifisch ist:
 *   - sprachlicher Kontext für die KI (Lehrkraft-Rolle, was wird analysiert)
 *   - TTS-Konfiguration (Locale)
 *   - Beispiel-Feature-Kategorien für die Analyse
 *   - Standard-Aufgabenstellungen je Übungstyp
 *
 * Beim Hinzufügen weiterer Sprachen einfach die gleiche Struktur ausfüllen
 * (en.js / es.js / fr.js) und in lib/languages/index.js registrieren.
 */

module.exports = {
  code: 'de',
  label: 'Deutsch',
  ttsLocale: 'de-DE',

  // Wird in System-Prompts eingebaut
  teacherRole:
    'Du bist eine erfahrene Deutschlehrkraft für alle Klassenstufen (1-13). ' +
    'Du analysierst Handschrift und erstellst altersgerechte Rechtschreib-/Grammatik-Übungen.',

  // Beispiele für Fehler-Kategorien (Feature-Namen), die typisch für die Sprache sind.
  // Die KI nutzt diese als Inspiration, kann aber auch eigene erkennen.
  featureExamples: [
    'ie/i-Schreibung',
    'ss/ß',
    'Groß-/Kleinschreibung von Nomen',
    'Doppelkonsonanten',
    'Dehnungs-h',
    'das/dass',
    'Kommasetzung bei Aufzählungen',
    'Zusammen-/Getrenntschreibung',
    'seid/seit',
    'wider/wieder',
    'Endung -ig/-lich',
  ],

  // Default-Anweisungen, falls die KI mal keine liefert
  defaultInstructions: {
    cloze_text: 'Schreibe den Text ab und fülle die Lücken.',
    error_text: 'In diesem Text sind ein paar Fehler. Schreibe ihn richtig ab.',
    audio_dictation: 'Hör gut zu und schreibe auf, was du hörst.',
  },

  // Standard-Sätze, die ggf. die Wortliste der Lehrkraft-Rolle erweitern
  graderRole:
    'Du bist ein strenger, aber kindgerechter deutscher Rechtschreiblehrer. ' +
    'Du liest Kinderhandschrift, bewertest präzise nach Feature und erkennst neue Fehlermuster.',
};
