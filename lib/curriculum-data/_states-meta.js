/**
 * Struktur-Metadaten der 16 Bundesländer:
 *   - welche Schulformen es im jeweiligen Bundesland gibt
 *   - bis zu welcher Klasse die Grundschule (Primarstufe) geht
 *   - Verweis auf die Quell-Curriculum-Dokumente
 *
 * Diese Datei steuert die dynamische Schulform-Auswahl im Frontend
 * und liefert der KI den korrekten Quellen-Verweis pro Profil.
 *
 * Stand: Schulsysteme der Länder, abgeleitet aus den hinterlegten
 * Lehrplan-Dokumenten (siehe `sources`-Pfad pro Bundesland).
 */

// Standard-Klassenbereich für Sek I (Default 5-10, kann pro Schulform überschrieben werden)
const SEK1 = [5, 6, 7, 8, 9, 10];
const SEK1_BB = [7, 8, 9, 10]; // in BE/BB beginnt Sek I erst ab Klasse 7
const PRIMAR_HAMBURG_BB = [1, 2, 3, 4, 5, 6]; // verlängerte Grundschule

const STATES_META = {
  BW: {
    name: 'Baden-Württemberg',
    primaryUpTo: 4,
    schoolForms: [
      { value: 'Grundschule', label: 'Grundschule', grades: [1, 2, 3, 4] },
      { value: 'Gemeinschaftsschule', label: 'Gemeinschaftsschule', grades: SEK1 },
      { value: 'Realschule', label: 'Realschule', grades: SEK1 },
      { value: 'Werkrealschule', label: 'Werkrealschule', grades: SEK1 },
      { value: 'Gymnasium', label: 'Gymnasium', grades: [5, 6, 7, 8, 9, 10, 11, 12] },
      { value: 'Berufliche Schule', label: 'Berufliche Schule', grades: [11, 12, 13] },
    ],
    source: 'Bildungsplan Baden-Württemberg 2016 (Deutsch)',
  },

  BY: {
    name: 'Bayern',
    primaryUpTo: 4,
    schoolForms: [
      { value: 'Grundschule', label: 'Grundschule', grades: [1, 2, 3, 4] },
      { value: 'Mittelschule', label: 'Mittelschule', grades: SEK1 },
      { value: 'Realschule', label: 'Realschule', grades: [5, 6, 7, 8, 9, 10] },
      { value: 'Gymnasium', label: 'Gymnasium', grades: [5, 6, 7, 8, 9, 10, 11, 12, 13] },
      { value: 'Fachoberschule', label: 'Fachoberschule', grades: [11, 12, 13] },
    ],
    source: 'LehrplanPLUS Bayern (Deutsch)',
  },

  BE: {
    name: 'Berlin',
    primaryUpTo: 6, // Berliner Grundschule geht bis Klasse 6
    schoolForms: [
      { value: 'Grundschule', label: 'Grundschule (1–6)', grades: PRIMAR_HAMBURG_BB },
      { value: 'Integrierte Sekundarschule', label: 'Integrierte Sekundarschule', grades: SEK1_BB },
      { value: 'Gymnasium', label: 'Gymnasium', grades: [7, 8, 9, 10, 11, 12] },
    ],
    source: 'Rahmenlehrplan Berlin/Brandenburg Deutsch (Teil C, 2024)',
  },

  BB: {
    name: 'Brandenburg',
    primaryUpTo: 6, // wie Berlin
    schoolForms: [
      { value: 'Grundschule', label: 'Grundschule (1–6)', grades: PRIMAR_HAMBURG_BB },
      { value: 'Oberschule', label: 'Oberschule', grades: SEK1_BB },
      { value: 'Gymnasium', label: 'Gymnasium', grades: [7, 8, 9, 10, 11, 12, 13] },
    ],
    source: 'Rahmenlehrplan Berlin/Brandenburg Deutsch (Teil C, 2024)',
  },

  HB: {
    name: 'Bremen',
    primaryUpTo: 4,
    schoolForms: [
      { value: 'Grundschule', label: 'Grundschule', grades: [1, 2, 3, 4] },
      { value: 'Oberschule', label: 'Oberschule', grades: [5, 6, 7, 8, 9, 10] },
      { value: 'Gymnasium', label: 'Gymnasium', grades: [5, 6, 7, 8, 9, 10, 11, 12] },
      { value: 'Berufsbildende Oberstufe', label: 'Berufsbildende Oberstufe', grades: [11, 12, 13] },
    ],
    source: 'Bildungsplan Bremen Deutsch',
  },

  HH: {
    name: 'Hamburg',
    primaryUpTo: 4,
    schoolForms: [
      { value: 'Grundschule', label: 'Grundschule', grades: [1, 2, 3, 4] },
      { value: 'Stadtteilschule', label: 'Stadtteilschule', grades: [5, 6, 7, 8, 9, 10, 11, 12, 13] },
      { value: 'Gymnasium', label: 'Gymnasium', grades: [5, 6, 7, 8, 9, 10, 11, 12] },
    ],
    source: 'Bildungsplan Hamburg Deutsch (2022)',
  },

  HE: {
    name: 'Hessen',
    primaryUpTo: 4,
    schoolForms: [
      { value: 'Grundschule', label: 'Grundschule', grades: [1, 2, 3, 4] },
      { value: 'Hauptschule', label: 'Hauptschule', grades: [5, 6, 7, 8, 9] },
      { value: 'Realschule', label: 'Realschule', grades: [5, 6, 7, 8, 9, 10] },
      { value: 'Gymnasium', label: 'Gymnasium', grades: [5, 6, 7, 8, 9, 10, 11, 12, 13] },
      { value: 'Gesamtschule', label: 'Gesamtschule', grades: [5, 6, 7, 8, 9, 10] },
      { value: 'Berufsschule', label: 'Berufsschule', grades: [11, 12] },
      { value: 'Fachoberschule', label: 'Fachoberschule', grades: [11, 12] },
    ],
    source: 'Hessisches Kerncurriculum Deutsch',
  },

  MV: {
    name: 'Mecklenburg-Vorpommern',
    primaryUpTo: 4,
    schoolForms: [
      { value: 'Grundschule', label: 'Grundschule', grades: [1, 2, 3, 4] },
      { value: 'Regionale Schule', label: 'Regionale Schule', grades: [5, 6, 7, 8, 9, 10] },
      { value: 'Gesamtschule', label: 'Gesamtschule', grades: [5, 6, 7, 8, 9, 10] },
      { value: 'Gymnasium', label: 'Gymnasium', grades: [5, 6, 7, 8, 9, 10, 11, 12] },
      { value: 'Fachoberschule', label: 'Fachoberschule', grades: [11, 12] },
      { value: 'Berufsschule', label: 'Berufsschule', grades: [11, 12] },
    ],
    source: 'Rahmenplan MV Deutsch',
  },

  NI: {
    name: 'Niedersachsen',
    primaryUpTo: 4,
    schoolForms: [
      { value: 'Grundschule', label: 'Grundschule', grades: [1, 2, 3, 4] },
      { value: 'Hauptschule', label: 'Hauptschule', grades: [5, 6, 7, 8, 9] },
      { value: 'Realschule', label: 'Realschule', grades: [5, 6, 7, 8, 9, 10] },
      { value: 'Oberschule', label: 'Oberschule', grades: [5, 6, 7, 8, 9, 10] },
      { value: 'Gymnasium', label: 'Gymnasium', grades: [5, 6, 7, 8, 9, 10, 11, 12, 13] },
      { value: 'Gesamtschule', label: 'Gesamtschule', grades: [5, 6, 7, 8, 9, 10] },
    ],
    source: 'Kerncurriculum Niedersachsen Deutsch (Grundschule 2025)',
  },

  NW: {
    name: 'Nordrhein-Westfalen',
    primaryUpTo: 4,
    schoolForms: [
      { value: 'Grundschule', label: 'Grundschule', grades: [1, 2, 3, 4] },
      { value: 'Hauptschule', label: 'Hauptschule', grades: [5, 6, 7, 8, 9, 10] },
      { value: 'Realschule', label: 'Realschule', grades: [5, 6, 7, 8, 9, 10] },
      { value: 'Sekundarschule', label: 'Sekundarschule', grades: [5, 6, 7, 8, 9, 10] },
      { value: 'Gesamtschule', label: 'Gesamtschule', grades: [5, 6, 7, 8, 9, 10] },
      { value: 'Gymnasium', label: 'Gymnasium', grades: [5, 6, 7, 8, 9, 10, 11, 12, 13] },
    ],
    source: 'Kernlehrplan NRW Deutsch (G9, 2019)',
  },

  RP: {
    name: 'Rheinland-Pfalz',
    primaryUpTo: 4,
    schoolForms: [
      { value: 'Grundschule', label: 'Grundschule', grades: [1, 2, 3, 4] },
      { value: 'Realschule plus', label: 'Realschule plus', grades: [5, 6, 7, 8, 9, 10] },
      { value: 'IGS', label: 'Integrierte Gesamtschule', grades: [5, 6, 7, 8, 9, 10] },
      { value: 'Gymnasium', label: 'Gymnasium', grades: [5, 6, 7, 8, 9, 10, 11, 12, 13] },
      { value: 'Fachoberschule', label: 'Fachoberschule', grades: [11, 12] },
      { value: 'Berufsbildende Schule', label: 'Berufsbildende Schule', grades: [10, 11, 12] },
    ],
    source: 'Lehrplan Rheinland-Pfalz Deutsch',
  },

  SL: {
    name: 'Saarland',
    primaryUpTo: 4,
    schoolForms: [
      { value: 'Grundschule', label: 'Grundschule', grades: [1, 2, 3, 4] },
      { value: 'Gemeinschaftsschule', label: 'Gemeinschaftsschule', grades: [5, 6, 7, 8, 9, 10] },
      { value: 'Gymnasium', label: 'Gymnasium', grades: [5, 6, 7, 8, 9, 10, 11, 12] },
      { value: 'Berufsschule', label: 'Berufsschule', grades: [10, 11, 12] },
    ],
    source: 'Kernlehrplan Saarland Deutsch',
  },

  SN: {
    name: 'Sachsen',
    primaryUpTo: 4,
    schoolForms: [
      { value: 'Grundschule', label: 'Grundschule', grades: [1, 2, 3, 4] },
      { value: 'Oberschule', label: 'Oberschule', grades: [5, 6, 7, 8, 9, 10] },
      { value: 'Gymnasium', label: 'Gymnasium', grades: [5, 6, 7, 8, 9, 10, 11, 12] },
      { value: 'Fachoberschule', label: 'Fachoberschule', grades: [11, 12] },
    ],
    source: 'Lehrplan Sachsen Deutsch (2022/2025)',
  },

  ST: {
    name: 'Sachsen-Anhalt',
    primaryUpTo: 4,
    schoolForms: [
      { value: 'Grundschule', label: 'Grundschule', grades: [1, 2, 3, 4] },
      { value: 'Sekundarschule', label: 'Sekundarschule', grades: [5, 6, 7, 8, 9, 10] },
      { value: 'Gymnasium', label: 'Gymnasium', grades: [5, 6, 7, 8, 9, 10, 11, 12] },
    ],
    source: 'Fachlehrplan Sachsen-Anhalt Deutsch (2019)',
  },

  SH: {
    name: 'Schleswig-Holstein',
    primaryUpTo: 4,
    schoolForms: [
      { value: 'Grundschule', label: 'Grundschule', grades: [1, 2, 3, 4] },
      { value: 'Gemeinschaftsschule', label: 'Gemeinschaftsschule', grades: [5, 6, 7, 8, 9, 10] },
      { value: 'Gymnasium', label: 'Gymnasium', grades: [5, 6, 7, 8, 9, 10, 11, 12, 13] },
    ],
    source: 'Fachanforderungen Deutsch Schleswig-Holstein (2018/2024)',
  },

  TH: {
    name: 'Thüringen',
    primaryUpTo: 4,
    schoolForms: [
      { value: 'Grundschule', label: 'Grundschule', grades: [1, 2, 3, 4] },
      { value: 'Regelschule', label: 'Regelschule', grades: [5, 6, 7, 8, 9, 10] },
      { value: 'Gymnasium', label: 'Gymnasium', grades: [5, 6, 7, 8, 9, 10, 11, 12] },
      { value: 'Fachoberschule', label: 'Fachoberschule', grades: [11, 12] },
      { value: 'Berufsbildende Schule', label: 'Berufsbildende Schule', grades: [10, 11, 12] },
    ],
    source: 'Lehrplan Thüringen Deutsch',
  },
};

/** Liste aller Bundesland-Codes */
function listStateCodes() {
  return Object.keys(STATES_META);
}

/** Vollständige Liste der Bundesländer mit Label für Frontend */
function listStatesForFrontend() {
  return Object.entries(STATES_META).map(([code, m]) => ({ value: code, label: m.name }));
}

/** Schulformen, die im gewählten Bundesland angeboten werden */
function listSchoolFormsForState(stateCode) {
  return STATES_META[stateCode]?.schoolForms || [];
}

/** Bis zu welcher Klasse läuft die Grundschule in dem Bundesland */
function primaryUpTo(stateCode) {
  return STATES_META[stateCode]?.primaryUpTo || 4;
}

/** Quellen-Verweis (Lehrplan-Name) pro Bundesland */
function curriculumSource(stateCode) {
  return STATES_META[stateCode]?.source || null;
}

/** Ist (state, schoolType, grade) eine gültige Kombination? */
function isValidProfile(stateCode, schoolType, grade) {
  const meta = STATES_META[stateCode];
  if (!meta) return false;
  const form = meta.schoolForms.find((s) => s.value === schoolType);
  if (!form) return false;
  return form.grades.includes(Number(grade));
}

module.exports = {
  STATES_META,
  listStateCodes,
  listStatesForFrontend,
  listSchoolFormsForState,
  primaryUpTo,
  curriculumSource,
  isValidProfile,
};
