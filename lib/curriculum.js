/**
 * Curriculum-Slot.
 *
 * Hier wird später das Lehrwerk / Kerncurriculum je nach
 * Bundesland + Klassenstufe + Schulform + Sprache nachgeschlagen.
 *
 * Quellen-Strategie:
 *   1. Eigene JSON-Sammlung (begrenzte Kombinationen, manuell gepflegt)
 *   2. Partner-APIs (Cornelsen, Klett, etc.) – über AVV/Lizenz
 *   3. Fallback: KI-Hint im Prompt ("Lehrplan für X kennst du")
 *
 * Aktueller Status: leerer Slot. Architektur ist da, Daten kommen später.
 * Sobald Verlags-/Partner-Daten verfügbar sind, einfach `lookupCurriculum`
 * implementieren – alle Prompts holen sich den Kontext automatisch.
 */

/**
 * Schlägt das Curriculum für ein Lerner-Profil nach.
 * @param {object} profile - { grade, schoolType, state, language }
 * @returns {object|null} - { source, themes[], topics[], focusFeatures[], textbook } oder null
 */
function lookupCurriculum(profile) {
  // TODO: hier später strukturierten Datenzugriff einbauen.
  // Aktuell: noch keine Daten verfügbar.
  return null;
}

/**
 * Erzeugt einen Prompt-Block, der das Curriculum-Wissen für die KI bereitstellt.
 * Wird in allen Prompts (analyze, next-exercise, submit) eingebaut.
 *
 * Fallback-Strategie (solange keine echten Daten da sind):
 *   Wir geben der KI einen klaren Kontext-Hinweis – Claude kennt die meisten
 *   Kerncurricula in groben Zügen und kann anhand von Bundesland + Klasse + Schulform
 *   zumindest niveau-angemessen agieren.
 */
function curriculumPromptBlock(profile) {
  if (!profile) return '';

  const data = lookupCurriculum(profile);
  if (data) {
    // Strukturierte Daten vorhanden – konkreter Lehrwerks-Kontext
    return (
      'CURRICULUM-KONTEXT (aus Lehrwerks-Daten):\n' +
      `- Lehrwerk: ${data.textbook || '–'}\n` +
      (data.themes?.length ? `- Aktuelle Themen: ${data.themes.join(', ')}\n` : '') +
      (data.focusFeatures?.length
        ? `- Erwartete Rechtschreib-/Grammatik-Features: ${data.focusFeatures.join(', ')}\n`
        : '') +
      '- Halte dich beim Erstellen von Übungen an diesen Kontext.\n'
    );
  }

  // Noch keine Daten → Claude soll selbst auf das Kerncurriculum schließen
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
