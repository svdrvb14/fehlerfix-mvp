/**
 * Prüfungen für Übungsformate (lib/exercises.js) und Wortliste (lib/wordregister.js).
 */
const ex = require('../lib/exercises');
const wr = require('../lib/wordregister');

let failed = 0;
const check = (name, cond, detail = '') => {
  console.log((cond ? '  ✓ ' : '  ✗ ') + name + (cond || !detail ? '' : '  → ' + detail));
  if (!cond) failed++;
};

console.log('\nÜbungsformate');
check('zweiundzwanzig Formate registriert', ex.allIds().length === 22, `${ex.allIds().length}`);
check('jedes Format hat eine Beschreibung', ex.TYPES.every((t) => t.spec && t.spec.length > 40));
check('jedes Format hat eine Ratechance', ex.TYPES.every((t) => t.guessRate > 0 && t.guessRate < 1));
check('Antwortmodus ist gültig',
  ex.TYPES.every((t) => ['canvas', 'cards'].includes(t.answerMode)));

console.log('\nPassung zur Fehler-Kategorie');
const forAuslaut = ex.typesForFeature('Auslautverhärtung').map((t) => t.id);
check('"Verlängern" passt zu Auslautverhärtung', forAuslaut.includes('lengthen_word'));
check('"Wortfamilie" passt NICHT zu Auslautverhärtung', !forAuslaut.includes('word_family'));

const forAbleiten = ex.typesForFeature('ä/e-Ableitung').map((t) => t.id);
check('"Wortfamilie" passt zu Ableitungen', forAbleiten.includes('word_family'));
check('"Verlängern" passt NICHT zu Ableitungen', !forAbleiten.includes('lengthen_word'));

const forKomma = ex.typesForFeature('Kommasetzung').map((t) => t.id);
check('"Sortieren" passt NICHT zu Kommasetzung', !forKomma.includes('sort_words'));
check('universelle Formate sind immer dabei',
  ['cloze_text', 'error_text', 'audio_dictation', 'flashcards'].every((id) => forKomma.includes(id)));

console.log('\nAbwechslung');
const recent = ['cloze_text', 'error_text', 'flashcards'];
const picked = Array.from({ length: 40 }, () => ex.pickType('ie/i-Schreibung', recent).id);
check('zuletzt genutzte Formate werden gemieden',
  !picked.some((id) => recent.includes(id)), [...new Set(picked)].join(','));
check('Auswahl bleibt bei den passenden Formaten',
  picked.every((id) => ex.typesForFeature('ie/i-Schreibung').some((t) => t.id === id)));

console.log('\nRatechance');
check('Zeichensetzung ist immer ein Münzwurf',
  ex.guessRateFor('cloze_text', 'Kommasetzung bei Aufzählungen') === 0.45);
check('Sortieren ist auch ohne Zeichensetzung ratbar', ex.getType('sort_words').guessRate === 0.45);
check('Diktat ist am schwersten zu raten',
  ex.getType('audio_dictation').guessRate < ex.getType('error_text').guessRate);

console.log('\nWortliste: nur echte, wiederholte Fehler');
let reg = [];
reg = wr.recordMistakes(reg, [{ wrong: 'Tir', correct: 'Tier' }]);
check('einmal falsch reicht nicht', wr.activeWords(reg).length === 0);
reg = wr.recordMistakes(reg, [{ wrong: 'Tir', correct: 'Tier' }]);
check('zweimal falsch wird aufgenommen', wr.activeWords(reg).length === 1);
check('richtige Schreibweise wird gemerkt', wr.activeWords(reg)[0].word === 'Tier');
check('Fehlschreibung wird festgehalten', wr.activeWords(reg)[0].variants.includes('Tir'));

for (let i = 0; i < wr.CORRECT_STREAK_TO_CLEAR; i++) reg = wr.recordCorrect(reg, ['Tier']);
check('nach genug richtigen Malen fällt es heraus', wr.activeWords(reg).length === 0);

check('erfindet keine Wörter', wr.activeWords(wr.recordCorrect([], ['Haus'])).length === 0);
check('leere Eingabe bleibt leere Liste', wr.recordMistakes([], []).length === 0);

let many = [];
for (let i = 0; i < 100; i++) {
  many = wr.recordMistakes(many, [{ wrong: `x${i}`, correct: `Wort${i}` }, { wrong: `y${i}`, correct: `Wort${i}` }]);
}
check('Liste bleibt begrenzt', many.length <= wr.MAX_ENTRIES, `${many.length}`);

console.log(failed === 0 ? '\nAlle Prüfungen bestanden.\n' : `\n${failed} Prüfung(en) fehlgeschlagen.\n`);
process.exit(failed === 0 ? 0 : 1);
