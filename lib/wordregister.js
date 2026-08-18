/**
 * Wortliste ("Merkwörter")
 * ========================
 *
 * Sammelt Wörter, die ein Lerner WIEDERHOLT falsch schreibt.
 *
 * GRUNDREGEL: Hier wird nichts erfunden. Ein Wort kommt nur hinein, wenn es
 * tatsächlich beobachtet wurde – und erst, wenn es MEHRFACH falsch war.
 * Ein einmaliger Verschreiber ist ein Ausrutscher, kein Merkwort.
 * Schreibt jemand nichts dauerhaft falsch, bleibt die Liste leer. Das ist
 * dann die richtige Antwort, nicht ein Mangel.
 *
 * Datenquelle sind die word_corrections aus der Korrektur – also konkrete
 * falsch→richtig-Paare, die die KI im Schülertext gefunden hat.
 */

// Ab wie vielen Fehlschreibungen gilt ein Wort als Merkwort
const MIN_WRONG_TO_LIST = 2;
// So oft in Folge richtig → gilt als gemeistert und fällt wieder heraus
const CORRECT_STREAK_TO_CLEAR = 3;
// Obergrenze, damit die Liste nicht unbegrenzt wächst
const MAX_ENTRIES = 60;

const normWord = (w) => String(w || '').trim().replace(/[.,;:!?"»«„“]/g, '');
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Falsch geschriebene Wörter verbuchen.
 * @param {Array} register bisherige Liste
 * @param {Array} corrections [{ wrong, correct, feature, fresch_strategy }]
 * @returns {Array} aktualisierte Liste
 */
function recordMistakes(register, corrections) {
  const list = Array.isArray(register) ? register.slice() : [];

  for (const c of corrections || []) {
    const word = normWord(c?.correct);   // wir merken uns die RICHTIGE Schreibweise
    const wrongAs = normWord(c?.wrong);
    if (!word || word.length < 2) continue;

    let entry = list.find((e) => e.word.toLowerCase() === word.toLowerCase());
    if (!entry) {
      entry = {
        word,
        wrong: 0,
        correctStreak: 0,
        variants: [],          // wie es falsch geschrieben wurde
        feature: c?.feature || null,
        strategy: c?.fresch_strategy || null,
        firstSeen: today(),
        lastWrong: null,
      };
      list.push(entry);
    }
    entry.wrong += 1;
    entry.correctStreak = 0;   // Fehler bricht die Serie
    entry.lastWrong = today();
    if (wrongAs && !entry.variants.includes(wrongAs)) {
      entry.variants = [...entry.variants, wrongAs].slice(-4);
    }
    if (c?.feature) entry.feature = c.feature;
    if (c?.fresch_strategy) entry.strategy = c.fresch_strategy;
  }

  return prune(list);
}

/**
 * Richtig geschriebene Merkwörter verbuchen.
 * @param {Array} register
 * @param {Array<string>} words Wörter aus der Liste, die diesmal korrekt waren
 */
function recordCorrect(register, words) {
  const list = Array.isArray(register) ? register.slice() : [];
  for (const w of words || []) {
    const word = normWord(w);
    if (!word) continue;
    const entry = list.find((e) => e.word.toLowerCase() === word.toLowerCase());
    if (!entry) continue;   // nur bekannte Wörter – nichts Neues erfinden
    entry.correctStreak = (entry.correctStreak || 0) + 1;
  }
  return prune(list);
}

/** Gemeisterte Wörter entfernen und Liste begrenzen. */
function prune(list) {
  return list
    .filter((e) => (e.correctStreak || 0) < CORRECT_STREAK_TO_CLEAR)
    .sort((a, b) => (b.wrong || 0) - (a.wrong || 0))
    .slice(0, MAX_ENTRIES);
}

/**
 * Die Wörter, die tatsächlich als Merkwörter gelten (mehrfach falsch).
 * Genau das, was Lerner und Lehrkraft zu sehen bekommen.
 */
function activeWords(register) {
  return (Array.isArray(register) ? register : [])
    .filter((e) => (e.wrong || 0) >= MIN_WRONG_TO_LIST)
    .sort((a, b) => (b.wrong || 0) - (a.wrong || 0));
}

/** Kurzform für Prompts: nur die Wörter, damit Übungen sie aufgreifen können. */
function wordsForPrompt(register, limit = 12) {
  return activeWords(register).slice(0, limit).map((e) => e.word);
}

module.exports = {
  MIN_WRONG_TO_LIST,
  CORRECT_STREAK_TO_CLEAR,
  MAX_ENTRIES,
  recordMistakes,
  recordCorrect,
  activeWords,
  wordsForPrompt,
};
