/**
 * Mastery-Modell – wie der Lernstand pro Fehler-Kategorie berechnet wird
 * =====================================================================
 *
 * WARUM ES DIESES MODUL GIBT
 * Früher hat die KI die Prozentwerte selbst vergeben ("gib mastery 15-25").
 * Das war eine Meinung: nicht reproduzierbar, nicht prüfbar, driftend.
 * Jetzt gilt eine klare Trennung:
 *
 *   KI   → liefert BEOBACHTUNGEN (Fakten):
 *          "Kategorie 'ie/i' kam in dieser Übung 4x vor, 3x davon richtig"
 *   Code → rechnet daraus den Lernstand. Deterministisch. Nachvollziehbar.
 *
 * DAS MODELL
 * Eine zeitgewichtete, rate-korrigierte Trefferquote:
 *
 *   1. RATE-KORREKTUR
 *      Eine richtige Komma-Entscheidung (ja/nein) ist weniger wert als ein
 *      richtig geschriebenes Diktatwort – bei der einen kann man raten, bei
 *      der anderen nicht. Aus der beobachteten Quote wird der Rateanteil
 *      herausgerechnet:  können = (quote - rate) / (1 - rate)
 *
 *   2. ZEITGEWICHTUNG
 *      Alte Evidenz verliert bei jeder neuen Übung an Gewicht (Faktor RECENCY).
 *      Der aktuelle Stand zählt mehr als der von vor drei Wochen – aber die
 *      Historie verschwindet nicht abrupt.
 *
 *   3. GLÄTTUNG
 *      Laplace-Glättung mit einem neutralen Vorwissen. Verhindert, dass eine
 *      einzelne Beobachtung 0% oder 100% erzeugt.
 *
 *   4. SCHRITTBEGRENZUNG
 *      Eine einzelne Übung darf den Wert nur begrenzt bewegen (wie der
 *      K-Faktor beim Elo-System). Ein Lernstand baut sich über mehrere
 *      Übungen auf, nicht in einer.
 *
 *   5. VERGESSEN
 *      Ohne Übung sinkt der Wert langsam Richtung eines Bodens.
 *
 * Warum nicht Bayesian Knowledge Tracing? BKT beantwortet "beherrscht ja/nein"
 * und polarisiert deshalb auf die Extreme. Wir wollen einen abgestuften Wert,
 * der die tatsächliche Trefferquote widerspiegelt.
 */

// ─── Parameter (hier wird kalibriert, nicht im Prompt) ───────
const RECENCY = 0.8;          // Gewicht, das alte Evidenz pro Übung behält
const PRIOR_WEIGHT = 3.0;     // Stärke des neutralen Vorwissens (Laplace)
const PRIOR_VALUE = 0.5;      // neutrales Vorwissen
const MAX_STEP_PER_EXERCISE = 0.15;  // max. Bewegung pro Übung

// Wissensstand bleibt zwischen 5% und 95%: absolute Sicherheit lässt sich aus
// Stichproben nicht behaupten, und das Modell bleibt an beiden Enden reaktionsfähig.
const P_MIN = 0.05;
const P_MAX = 0.95;

// Vergessenskurve
const DECAY_FLOOR = 0.25;
const DECAY_HALFLIFE_DAYS = 45;
const DECAY_GRACE_DAYS = 7;

// Ab wie vielen Gelegenheiten gilt der Wert als belastbar
const CONFIDENCE_FULL_AT = 8;

// ─── Rate-Wahrscheinlichkeit je Aufgabentyp ──────────────────
const GUESS_BY_TYPE = {
  cloze_text: 0.12,       // Buchstaben in eine Lücke schreiben
  error_text: 0.18,       // Fehler übersehen / zufällig richtig abgeschrieben
  audio_dictation: 0.05,  // freie Produktion – kaum zu raten
};
const GUESS_PUNCTUATION = 0.45;  // Komma ja/nein ist faktisch eine Münze
const GUESS_DEFAULT = 0.12;

const clampP = (x) => Math.max(P_MIN, Math.min(P_MAX, x));

/** Rate-Wahrscheinlichkeit für eine konkrete Übung + Kategorie. */
function guessRateFor(exerciseType, featureName = '') {
  if (/komma|zeichensetzung|satzzeichen|interpunktion/i.test(featureName)) {
    return GUESS_PUNCTUATION;
  }
  return GUESS_BY_TYPE[exerciseType] ?? GUESS_DEFAULT;
}

/**
 * Rechnet den Rateanteil aus einer beobachteten Trefferquote heraus.
 * Beispiel: 75% richtig bei 45% Ratechance → echtes Können ≈ 55%
 */
function correctForGuessing(rate, guessRate) {
  if (guessRate >= 0.999) return 0;
  return Math.max(0, (rate - guessRate) / (1 - guessRate));
}

/**
 * Aus gewichteter Evidenz den Prozentwert berechnen (Laplace-geglättet).
 * @param {number} evidCorrect gewichtete, rate-korrigierte Treffer
 * @param {number} evidTotal   gewichtete Gelegenheiten
 */
function masteryFromEvidence(evidCorrect, evidTotal) {
  const num = evidCorrect + PRIOR_VALUE * PRIOR_WEIGHT;
  const den = evidTotal + PRIOR_WEIGHT;
  return clampP(num / den);
}

/**
 * Eine Übung verarbeiten.
 *
 * @param {object} ev  bisherige Evidenz { correct, total } (gewichtet)
 * @param {object} obs neue Beobachtung  { correct, total } (gezählt)
 * @param {number} guessRate Ratechance für diesen Aufgabentyp
 * @returns {{ evidence: {correct:number,total:number}, mastery:number }}
 */
function observe(ev, obs, guessRate) {
  const prevCorrect = Number(ev?.correct) || 0;
  const prevTotal = Number(ev?.total) || 0;
  const prevMastery = masteryFromEvidence(prevCorrect, prevTotal);

  const total = Math.max(0, Math.round(obs?.total || 0));
  const correct = Math.max(0, Math.min(total, Math.round(obs?.correct || 0)));
  if (total === 0) {
    return { evidence: { correct: prevCorrect, total: prevTotal }, mastery: prevMastery };
  }

  // Rateanteil herausrechnen
  const skill = correctForGuessing(correct / total, guessRate);

  // Alte Evidenz abwerten, neue dazu
  const newCorrect = RECENCY * prevCorrect + skill * total;
  const newTotal = RECENCY * prevTotal + total;

  // Schrittbegrenzung: eine Übung bewegt den Wert nur begrenzt
  const raw = masteryFromEvidence(newCorrect, newTotal);
  const delta = Math.max(-MAX_STEP_PER_EXERCISE,
                Math.min(MAX_STEP_PER_EXERCISE, raw - prevMastery));
  const capped = clampP(prevMastery + delta);

  // Evidenz so zurückskalieren, dass sie zum begrenzten Wert passt –
  // sonst würde die Begrenzung bei der nächsten Übung schlagartig aufholen.
  const scaled = evidenceFor(capped, newTotal);
  return { evidence: scaled, mastery: capped };
}

/** Umkehrung: zu einem gewünschten Wert die passende Evidenz erzeugen. */
function evidenceFor(mastery, total) {
  const t = Math.max(0, total);
  const c = mastery * (t + PRIOR_WEIGHT) - PRIOR_VALUE * PRIOR_WEIGHT;
  return { correct: Math.max(0, c), total: t };
}

/**
 * Startwert aus dem Onboarding.
 * Die KI zählt, wie oft eine Kategorie im Text vorkam und wie oft sie falsch
 * war – daraus wird direkt die geglättete Quote. Kein Raten nötig, weil in
 * freien Texten nichts geraten wird.
 */
function initialFromCounts({ occurrences = 0, errors = 0 }) {
  const n = Math.max(0, Math.round(occurrences));
  const e = Math.max(0, Math.min(n, Math.round(errors)));
  const correct = n - e;
  if (n === 0) {
    // Kategorie kam nicht vor → keine Evidenz. Leicht positiv starten:
    // steht im Lehrplan, aber wir haben keinen Fehler gesehen.
    return { evidence: { correct: 0, total: 0 }, mastery: 0.6 };
  }
  return {
    evidence: { correct, total: n },
    mastery: masteryFromEvidence(correct, n),
  };
}

/** Vergessen: ohne Übung sinkt der Wert langsam Richtung Boden. */
function applyDecay(mastery, daysSince) {
  if (!Number.isFinite(daysSince) || daysSince <= DECAY_GRACE_DAYS) return mastery;
  if (mastery <= DECAY_FLOOR) return mastery;
  const effective = daysSince - DECAY_GRACE_DAYS;
  const factor = Math.pow(0.5, effective / DECAY_HALFLIFE_DAYS);
  return clampP(DECAY_FLOOR + (mastery - DECAY_FLOOR) * factor);
}

/** Anzeigewert 0–100. */
const toPercent = (mastery) => Math.round(clampP(mastery) * 100);

/**
 * Belastbarkeit des Werts (0–1), wächst mit der Zahl der Gelegenheiten.
 * Wichtig fürs Lehrer-Dashboard: 40% aus 2 Gelegenheiten ist etwas anderes
 * als 40% aus 20.
 */
const confidence = (total = 0) => Math.min(1, Math.max(0, total / CONFIDENCE_FULL_AT));

/** Einordnung in Worten für die Schüler-Ansicht. */
function label(mastery) {
  const p = toPercent(mastery);
  if (p < 40) return 'Üben wir noch';
  if (p < 70) return 'Wird schon besser';
  return 'Sitzt gut';
}

module.exports = {
  RECENCY, PRIOR_WEIGHT, PRIOR_VALUE, MAX_STEP_PER_EXERCISE,
  P_MIN, P_MAX, CONFIDENCE_FULL_AT,
  GUESS_BY_TYPE, GUESS_PUNCTUATION,
  guessRateFor, correctForGuessing,
  masteryFromEvidence, evidenceFor,
  observe, initialFromCounts, applyDecay,
  toPercent, confidence, label,
};
