/**
 * Curriculum-Slot.
 *
 * Quellen-Strategie:
 *   1. Eigene strukturierte JSON-Daten (Detail-Themen pro Klassenbereich) –
 *      aktuell vorhanden: Hessen. Weitere Bundesländer werden schrittweise
 *      ausgebaut, wenn die jeweiligen PDFs ausgewertet sind.
 *   2. Generischer Quell-Hinweis pro Bundesland – KI bekommt den korrekten
 *      Lehrplan-Namen als Kontext und nutzt ihr Allgemeinwissen.
 *   3. Partner-APIs (Cornelsen, Klett, etc.) – via AVV/Lizenz, kommt später.
 *
 * Die Struktur (_states-meta) ist die Single Source of Truth für:
 *   - Schulformen pro Bundesland (Frontend liest das via /api/profile-options)
 *   - Primarstufen-Grenze (Auto-Grundschule)
 *   - Lehrplan-Quelle für den KI-Hint
 */

const {
  listSchoolFormsForState,
  primaryUpTo,
  curriculumSource,
  listStatesForFrontend,
  listStateCodes,
  isValidProfile,
  STATES_META,
} = require('./curriculum-data/_states-meta');

const hessen = require('./curriculum-data/hessen');

// Bundesländer mit detaillierten Curriculum-Themen pro Klassenstufe
const DETAILED_STATES = {
  HE: hessen,
};

/**
 * Schlägt das Curriculum für ein Lerner-Profil nach.
 * Detail-Daten wenn vorhanden, sonst nur Quellen-Verweis.
 */
function lookupCurriculum(profile) {
  if (!profile || !profile.state) return null;

  // Detail-Daten verfügbar?
  const detailed = DETAILED_STATES[profile.state];
  if (detailed) {
    const data = detailed.lookup(profile);
    if (data) return { ...data, hasDetailedData: true };
  }

  // Fallback: nur Quellen-Verweis aus den Meta-Daten
  const source = curriculumSource(profile.state);
  if (!source) return null;
  return {
    source,
    hasDetailedData: false,
    focus: null,
    topics: null,
    strategies: null,
  };
}

/**
 * Prompt-Block für die KI mit Curriculum-Kontext.
 */
function curriculumPromptBlock(profile) {
  if (!profile) return '';

  const data = lookupCurriculum(profile);

  // Bundesland nicht unterstützt → generischer Fallback
  if (!data) {
    const stateLabel = profile.state || '–';
    const grade = profile.grade || '–';
    const schoolType = profile.schoolType || '–';
    return (
      'CURRICULUM-KONTEXT (kein hinterlegtes Lehrwerk):\n' +
      `- Bundesland ${stateLabel}, Klasse ${grade}, Schulform: ${schoolType}\n` +
      '- Nutze typische Inhalte und Standards der Klassenstufe.\n'
    );
  }

  // Detail-Daten vorhanden (z.B. Hessen)
  if (data.hasDetailedData) {
    return (
      'CURRICULUM-KONTEXT (offizielle Lehrplan-Daten):\n' +
      `- Quelle: ${data.source}\n` +
      `- Schwerpunkt für diese Stufe: ${data.focus}\n` +
      `- Erwartete Rechtschreib-/Grammatik-Themen:\n` +
      data.topics.map((t) => `    • ${t}`).join('\n') +
      '\n' +
      `- Empfohlene FRESCH-Strategien für diese Stufe: ${data.strategies.join(', ')}\n` +
      '- Halte dich beim Erstellen von Übungen und beim Erklären von Fehlern an diesen Kontext.\n' +
      '- Wähle Übungs-Themen, die zum Stoff dieser Stufe passen ' +
      '(nicht schon Inhalte späterer Klassen).\n' +
      (data.note ? `- Hinweis: ${data.note}\n` : '')
    );
  }

  // Nur Quellen-Verweis → KI soll auf eigenes Wissen zugreifen, aber mit klarem Anker
  return (
    'CURRICULUM-KONTEXT (Quellen-Verweis):\n' +
    `- Maßgeblicher Lehrplan: ${data.source}\n` +
    `- Klassenstufe: ${profile.grade}, Schulform: ${profile.schoolType}, Bundesland: ${profile.state}\n` +
    '- Orientiere dich an diesem Lehrplan / Bildungsplan. ' +
    'Wenn dir Details nicht bekannt sind, nutze die fachüblichen Schwerpunkte ' +
    'der entsprechenden Klassenstufe in Deutschland (Rechtschreibung, Grammatik, Zeichensetzung).\n' +
    '- Wähle keine Themen, die für diese Stufe noch zu früh oder schon zu spät sind.\n'
  );
}

module.exports = {
  lookupCurriculum,
  curriculumPromptBlock,
  // Re-Exports für API-Endpoints + Validierung
  listSchoolFormsForState,
  primaryUpTo,
  curriculumSource,
  listStatesForFrontend,
  listStateCodes,
  isValidProfile,
  STATES_META,
};
