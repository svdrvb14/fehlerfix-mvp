/**
 * Curriculum-Slot.
 *
 * Quellen-Strategie:
 *   1. Eigene strukturierte JSON-Daten pro Bundesland (aktuell: Hessen)
 *   2. Partner-APIs (Cornelsen, Klett, etc.) – über AVV/Lizenz, noch nicht angebunden
 *   3. Fallback: KI-Hint im Prompt (Claude kennt die Kerncurricula in groben Zügen)
 *
 * Wenn weitere Bundesländer dazukommen, einfach hier registrieren:
 *   const baden = require('./curriculum-data/baden-wuerttemberg');
 *   STATES['BW'] = baden;
 */

const hessen = require('./curriculum-data/hessen');

const STATES = {
  HE: hessen,
};

/**
 * Schlägt das Curriculum für ein Lerner-Profil nach.
 * @param {object} profile - { grade, schoolType, state, language }
 * @returns {object|null} - { source, focus, topics[], strategies[] } oder null
 */
function lookupCurriculum(profile) {
  if (!profile || !profile.state) return null;
  const stateModule = STATES[profile.state];
  if (!stateModule) return null;
  return stateModule.lookup(profile);
}

/**
 * Erzeugt einen Prompt-Block, der das Curriculum-Wissen für die KI bereitstellt.
 * Wird in allen Prompts (analyze, next-exercise, submit) eingebaut.
 */
function curriculumPromptBlock(profile) {
  if (!profile) return '';

  const data = lookupCurriculum(profile);
  if (data) {
    // Strukturierte Daten vorhanden
    return (
      'CURRICULUM-KONTEXT (Hessisches Kerncurriculum):\n' +
      `- Quelle: ${data.source}\n` +
      `- Schwerpunkt für diese Stufe: ${data.focus}\n` +
      `- Erwartete Rechtschreib-/Grammatik-Themen:\n` +
      data.topics.map((t) => `    • ${t}`).join('\n') +
      '\n' +
      `- Empfohlene FRESCH-Strategien für diese Stufe: ${data.strategies.join(', ')}\n` +
      '- Halte dich beim Erstellen von Übungen und beim Erklären von Fehlern an diesen Kontext.\n' +
      '- Wähle Übungs-Themen, die zum erwartet Stoff dieser Stufe passen ' +
      '(nicht schon Inhalte späterer Klassen).\n' +
      (data.note ? `- Hinweis: ${data.note}\n` : '')
    );
  }

  // Kein hinterlegtes Curriculum → Claude soll selbst auf das Kerncurriculum schließen
  const stateLabel = profile.state || '–';
  const grade = profile.grade || '–';
  const schoolType = profile.schoolType || '–';
  const language = profile.language || 'Deutsch';
  return (
    'CURRICULUM-KONTEXT (kein Lehrwerk hinterlegt – nutze dein Wissen):\n' +
    `- Land/Region: Deutschland, Bundesland ${stateLabel}\n` +
    `- Klassenstufe: ${grade}, Schulform: ${schoolType}\n` +
    `- Fach: ${language} (Rechtschreibung & Grammatik)\n` +
    '- Orientiere dich am Kerncurriculum / Bildungsplan des Bundeslandes für diese Stufe. ' +
    'Wenn dir kein expliziter Lehrplan bekannt ist, nutze die typischen Schwerpunkte der ' +
    'Stufe (z.B. Grundschule Klasse 3: ie/i, ck/k, Doppelkonsonanten; Sek I Klasse 7: das/dass, ' +
    'Kommasetzung, seid/seit).\n'
  );
}

module.exports = { lookupCurriculum, curriculumPromptBlock };
