/**
 * Prüfungen für das Mastery-Modell (lib/mastery.js).
 * Ausführen mit:  npm test
 *
 * Diese Tests halten das Verhalten fest, das wir wollen. Wer die Parameter
 * in lib/mastery.js verändert, sieht hier sofort, ob das Modell noch sinnvoll
 * rechnet.
 */
const m = require('../lib/mastery');

let failed = 0;
function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    console.log(`  ✗ ${name}${detail ? '  → ' + detail : ''}`);
    failed++;
  }
}

/** Gleichgewicht: Wo landet der Wert bei dauerhaft gleicher Trefferquote? */
function equilibrium(correct, total, guessRate, rounds = 40) {
  let ev = { correct: 0, total: 0 };
  let ma = 0.5;
  for (let i = 0; i < rounds; i++) {
    const r = m.observe(ev, { correct, total }, guessRate);
    ev = r.evidence;
    ma = r.mastery;
  }
  return m.toPercent(ma);
}

const g = m.guessRateFor('cloze_text', 'ie/i-Schreibung');

console.log('\nGleichgewicht spiegelt die Trefferquote');
const eq = [0, 1, 2, 3, 4].map((c) => equilibrium(c, 4, g));
check('monoton steigend', eq.every((v, i) => i === 0 || v > eq[i - 1]), eq.join(' < '));
check('0% richtig ergibt sehr niedrigen Wert', eq[0] <= 15, `${eq[0]}%`);
check('50% richtig ergibt Mittelfeld', eq[2] >= 30 && eq[2] <= 60, `${eq[2]}%`);
check('100% richtig ergibt hohen Wert', eq[4] >= 85, `${eq[4]}%`);

console.log('\nRate-Korrektur: Geratenes zählt weniger');
const dictation = equilibrium(2, 4, m.guessRateFor('audio_dictation', 'ie/i'));
const comma = equilibrium(2, 4, m.guessRateFor('cloze_text', 'Kommasetzung'));
check('Komma-Treffer zählen weniger als Diktat-Treffer', comma < dictation, `${comma}% < ${dictation}%`);
check('Zeichensetzung wird als Ratefall erkannt',
  m.guessRateFor('cloze_text', 'Kommasetzung bei Aufzählungen') === m.GUESS_PUNCTUATION);

console.log('\nStartwerte aus dem Onboarding');
const init = (o, e) => m.toPercent(m.initialFromCounts({ occurrences: o, errors: e }).mastery);
check('mehr Fehler → niedrigerer Startwert', init(6, 4) < init(6, 2) && init(6, 2) < init(6, 0));
check('alles falsch ergibt niedrigen Wert', init(3, 3) <= 30, `${init(3, 3)}%`);
check('ohne Vorkommen neutral-positiv', init(0, 0) >= 50 && init(0, 0) <= 70, `${init(0, 0)}%`);

console.log('\nStabilität');
const a = m.observe({ correct: 5, total: 10 }, { correct: 2, total: 4 }, g);
const b = m.observe({ correct: 5, total: 10 }, { correct: 2, total: 4 }, g);
check('deterministisch: gleiche Eingabe, gleiches Ergebnis', a.mastery === b.mastery);

const before = m.masteryFromEvidence(0, 8);
const after = m.observe({ correct: 0, total: 8 }, { correct: 4, total: 4 }, g).mastery;
check('eine Übung bewegt höchstens die erlaubte Schrittweite',
  Math.abs(after - before) <= m.MAX_STEP_PER_EXERCISE + 0.001,
  `${Math.round((after - before) * 100)} Punkte`);

check('Wert bleibt in den Grenzen',
  [0, 0.5, 1, -1, 2].every((x) => {
    const p = m.toPercent(x);
    return p >= m.P_MIN * 100 && p <= m.P_MAX * 100;
  }));

console.log('\nVergessen');
check('erste Woche unverändert', m.applyDecay(0.85, 5) === 0.85);
check('sinkt über die Zeit', m.applyDecay(0.85, 90) < m.applyDecay(0.85, 20));
check('fällt nicht unter den Boden', m.applyDecay(0.85, 3650) >= 0.25);

console.log('\nBelastbarkeit');
check('wächst mit der Zahl der Gelegenheiten', m.confidence(2) < m.confidence(8));
check('ist bei genug Gelegenheiten voll', m.confidence(m.CONFIDENCE_FULL_AT) === 1);

console.log(failed === 0
  ? '\nAlle Prüfungen bestanden.\n'
  : `\n${failed} Prüfung(en) fehlgeschlagen.\n`);
process.exit(failed === 0 ? 0 : 1);
