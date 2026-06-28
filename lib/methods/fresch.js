/**
 * FRESCH-Methode (Freiburger Rechtschreibschule).
 *
 * Vier aufeinander aufbauende Lernstrategien für deutsche Rechtschreibung,
 * entwickelt im Oberschulamt Freiburg, zentral für LRS-Förderung – aber auch
 * für den regulären Rechtschreibunterricht ab Klasse 1 wirksam.
 *
 * Kernidee: Sprache + Bewegung (Sprechen + Schreiben) werden synchron ausgeführt,
 * damit das Kind den orthografischen Rhythmus internalisiert. Vier Strategien
 * decken die meisten Rechtschreib-Phänomene des Deutschen ab.
 *
 * Quelle: Christina Braun, „Die FRESCH-Methode" (Examensarbeit, Univ. zu Köln 2011).
 */

const FRESCH_STRATEGIES = {
  schwingen: {
    key: 'schwingen',
    label: 'Schwingen',
    longLabel: 'Sprechschwingen & Sprechschreiben',
    short:
      'Wörter in Silben sprechen und gleichzeitig in Silben aufschreiben – ' +
      'mit deutlicher Pause zwischen den Silben.',
    appliesTo: [
      'Lautgetreue Schreibungen (ein Buchstabe pro Laut)',
      'Doppelkonsonanten / Silbengelenke (Sommer, rennen, Tatze)',
      'Offene vs. geschlossene Silben (lange/kurze Vokale)',
    ],
    examples: [
      'Som-mer (zwei Indianer im Boot: doppeltes m hörbar in der Pause)',
      'To-ma-te (offene Silben, alle Vokale lang/gespannt)',
      'Kin-der (geschlossene Silbe, i kurz/ungespannt)',
    ],
    childExplanation:
      'Sprich das Wort in Silben und schreib es Silbe für Silbe. ' +
      'In der Pause zwischen zwei Silben hörst du, ob ein Doppel-Mitlaut hinkommt.',
  },

  verlaengern: {
    key: 'verlaengern',
    label: 'Verlängern',
    longLabel: 'Rhythmisches Verlängern',
    short:
      'Wenn du am Wortende unsicher bist (p/b, t/d, k/g, s/ss), verlängere ' +
      'das Wort: Mehrzahl bei Nomen, Komparativ bei Adjektiven, „wir-Form" bei Verben.',
    appliesTo: [
      'Auslautverhärtung (Berg → Berge, schob → schoben)',
      'Doppelkonsonanten am Wortende (hell → helle)',
      'b/p, d/t, g/k am Wortende',
    ],
    examples: [
      'Berg → die Berge (also „g", nicht „k")',
      'hell → helle (also „ll", nicht „l")',
      'weiß → noch weißer (also „ß", nicht „s")',
    ],
    childExplanation:
      'Mach das Wort länger – sprich es in der Mehrzahl oder mit „wir". ' +
      'Dann hörst du den richtigen Buchstaben am Ende.',
  },

  ableiten: {
    key: 'ableiten',
    label: 'Ableiten',
    longLabel: 'Ableiten vom Grundwort',
    short:
      'Bei ä/e oder äu/eu: suche das Grundwort. Steht dort a oder au, ' +
      'wird daraus ä oder äu.',
    appliesTo: [
      'ä/e-Schreibung (Zähne ← Zahn, Bäume ← Baum)',
      'äu/eu-Schreibung (Läufer ← Lauf, Gebäude ← bauen)',
      'Familienverwandtschaft von Wörtern (Wortfamilien)',
    ],
    examples: [
      'Zähne → von „Zahn" (a wird ä)',
      'Läufer → von „Lauf" (au wird äu)',
      'glänzen → von „Glanz" (a wird ä)',
    ],
    childExplanation:
      'Such das verwandte Wort, das du schon kennst. Wenn da ein a steht, ' +
      'schreibst du ä – wenn da au steht, schreibst du äu.',
  },

  merken: {
    key: 'merken',
    label: 'Merken',
    longLabel: 'Merkwörter / Stolperwörter',
    short:
      'Wörter, bei denen Schwingen, Verlängern und Ableiten nicht weiterhelfen, ' +
      'muss man sich einfach merken – am besten in einem eigenen Merkheft.',
    appliesTo: [
      'Dehnungs-h (ahnen, fehlen, allmählich)',
      'v-Wörter (Vater, Vogel, Klavier, Vase)',
      'Funktionswörter (und, aber, viel, hier)',
      'Doppelvokal-Wörter (Boot, See, Tee)',
      'Unregelmäßige ie/i-Schreibungen (Vieh, Maschine)',
    ],
    examples: [
      'fehlen (mit Dehnungs-h – kein anderes Wort hilft)',
      'Vater (mit V – obwohl es wie F klingt)',
      'Boot (mit doppeltem o)',
    ],
    childExplanation:
      'Manche Wörter musst du dir einfach merken – schreib sie in dein Merkheft ' +
      'und übe sie immer mal wieder.',
  },
};

/**
 * Ordnet einen Feature-Namen einer FRESCH-Strategie zu.
 * Heuristisch – KI darf in ihren Antworten konkretisieren.
 */
function strategyForFeature(featureName) {
  const n = String(featureName || '').toLowerCase();
  if (/ie\/i|ss\/ß|doppel|silben|laut(e)?$|alphab|geminat/.test(n)) return 'schwingen';
  if (/auslaut|wortend|verlängern|verlang|b\/p|d\/t|g\/k|h-doppel/.test(n)) return 'verlaengern';
  if (/ä\/e|äu\/eu|ableit|wortfamilie|stamm/.test(n)) return 'ableiten';
  if (/dehnung|merkwort|v-wort|funktionswort|doppelvokal|fremdwort/.test(n)) return 'merken';
  // Default: Schwingen ist die universellste Strategie für Anfänger
  return 'schwingen';
}

/**
 * Liefert eine kurze Übersichts-Erklärung der FRESCH-Methode für die KI.
 * Wird in alle Prompts als Methodischer Kontext eingebaut.
 */
function freschMethodPromptBlock() {
  return (
    'METHODIK – FRESCH (Freiburger Rechtschreibschule):\n' +
    'Erkläre Fehler IMMER mit einer der vier FRESCH-Strategien. Nenne explizit ' +
    'die Strategie und führe sie kindgerecht vor:\n' +
    '  1) SCHWINGEN: Wort in Silben sprechen + Silbe für Silbe schreiben. ' +
    'In der Pause zwischen Silben werden Doppel-Mitlaute hörbar.\n' +
    '     z.B. "Sprich Som-mer mit Pause – du hörst beide m."\n' +
    '  2) VERLÄNGERN: Bei unklarem Wort-Ende das Wort verlängern ' +
    '(Mehrzahl / Komparativ / „wir-Form"). Dadurch wird der Auslaut hörbar.\n' +
    '     z.B. "Verlängere Berg → die Berge. Du hörst das g, also kein k."\n' +
    '  3) ABLEITEN: Bei ä/e oder äu/eu das Grundwort suchen. ' +
    'Steht dort a oder au, wird ä bzw. äu geschrieben.\n' +
    '     z.B. "Zähne kommt von Zahn – aus a wird ä."\n' +
    '  4) MERKEN: Wenn die ersten drei Strategien nicht greifen ' +
    '(Dehnungs-h, v-Wörter, Funktionswörter, Doppelvokale), als Merkwort lernen.\n' +
    '     z.B. "fehlen schreibt man mit Dehnungs-h – das musst du dir merken."\n\n' +
    'WICHTIG: In jeder Erklärung (z.B. in word_corrections oder explanation) ' +
    'immer die passende Strategie nennen und kindgerecht vorführen.'
  );
}

module.exports = {
  FRESCH_STRATEGIES,
  strategyForFeature,
  freschMethodPromptBlock,
};
