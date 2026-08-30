/**
 * Übungsformate – Registry
 * ========================
 *
 * Jedes Format beschreibt sich hier selbst: wozu es passt, wie leicht man
 * raten kann, und was die KI beim Erzeugen beachten muss.
 *
 * WARUM EINE REGISTRY: Mit drei Formaten konnte man stur durchrotieren. Bei
 * zwölf geht das nicht mehr – "Verlängern" ergibt nur bei Auslautverhärtung
 * Sinn, "Wortfamilie" nur bei Ableitungen. Deshalb meldet jedes Format über
 * `suits`, für welche Fehler-Kategorien es taugt. Ausgewählt wird dann nur
 * unter den passenden, mit Abwechslung.
 *
 * ANTWORTMODUS
 *   'canvas' – ein Blatt, eine Abgabe (bisheriges Verhalten)
 *   'cards'  – mehrere Karten nacheinander, jede einzeln geprüft (Flashcards)
 *
 * RATECHANCE (`guessRate`)
 *   Fließt ins Mastery-Modell ein (lib/mastery.js). Wo man zwischen zwei
 *   Möglichkeiten wählt, ist Raten leicht – ein Treffer zählt dort weniger.
 */

// Kategorien, für die ein Format besonders gut passt
const RE_AUSLAUT = /auslaut|wortend|b\/p|d\/t|g\/k|doppelkonsonant|ss\/ß/i;
const RE_ABLEITEN = /ä\/e|äu\/eu|ableit|wortfamilie|wortstamm|umlaut/i;
const RE_SILBE = /silb|doppelkonsonant|dehnung|lang|kurz|vokal|laut/i;
const RE_BINAER = /das\/dass|ie\/i|ss\/ß|seid\/seit|wider\/wieder|ä\/e|äu\/eu|groß|klein|getrennt|zusammen/i;
const RE_ZEICHEN = /komma|zeichensetzung|satzzeichen|interpunktion/i;
const RE_NUMERUS = /mehrzahl|einzahl|plural|singular|numerus/i;

const ALWAYS = () => true;

const TYPES = [
  // ─────────────── Die drei bisherigen ───────────────
  {
    id: 'cloze_text',
    label: 'Lückentext',
    answerMode: 'canvas',
    guessRate: 0.12,
    suits: ALWAYS,
    spec:
      'LÜCKENTEXT: Ein zusammenhängender Text (4-5 Sätze, kleine Geschichte mit rotem Faden) ' +
      'mit MINDESTENS 6, besser 7-10 Entscheidungsstellen.\n' +
      'A) Rechtschreib-Kategorien: Setze "___" für die Buchstabengruppe, wo das Feature greift ' +
      '(z.B. "T___ger" → "ie"). NIE Lücken auf Satzzeichen, Bindestriche, Leerzeichen oder ganze Wörter.\n' +
      'B) Zeichensetzung: KEINE "___". Markiere JEDE mögliche Kommastelle mit " [ ] " – auch solche, ' +
      'an denen KEIN Komma hingehört (Fallen). Der correctText enthält die korrekt gesetzten Kommas.\n' +
      'instruction-Beispiel: "Schreibe den Text ab und fülle die Lücken."',
  },
  {
    id: 'error_text',
    label: 'Fehlertext',
    answerMode: 'canvas',
    guessRate: 0.18,
    suits: ALWAYS,
    spec:
      'FEHLERTEXT: Ein zusammenhängender Text (4-5 Sätze) mit 4-6 eingebauten Rechtschreibfehlern – ' +
      'ALLE zum Fokus-Feature. Alle anderen Wörter sind korrekt. Fehler müssen authentisch sein ' +
      '(Verwechslungen, die diese Klassenstufe wirklich macht), keine Fantasiefehler. ' +
      'Niemals Satzzeichen weglassen, um einen Fehler zu erzeugen.\n' +
      'instruction-Beispiel: "In diesem Text sind ein paar Fehler. Schreibe ihn richtig ab."',
  },
  {
    id: 'audio_dictation',
    label: 'Audio-Diktat',
    answerMode: 'canvas',
    guessRate: 0.05,
    suits: ALWAYS,
    spec:
      'AUDIO-DIKTAT: Ein zusammenhängender, vollständig KORREKTER Text (3-5 Sätze), der langsam ' +
      'vorgelesen wird. Enthält 4-6 Wörter mit dem Fokus-Feature. KEINE Lücken, KEINE Fehler. ' +
      'Gut sprechbar: keine Anführungszeichen, keine Abkürzungen, keine Zahlen, keine Bindestrich-Wörter.\n' +
      'displayText MUSS ein leerer String "" sein – der Text wird nur vorgelesen.\n' +
      'instruction-Beispiel: "Hör gut zu und schreibe auf, was du hörst."',
  },

  // ─────────────── Flashcards (Karten-Modus) ───────────────
  {
    id: 'flashcards',
    label: 'Wortkarten',
    answerMode: 'cards',
    guessRate: 0.05,
    suits: ALWAYS,
    spec:
      'WORTKARTEN: 5-7 einzelne Karten. Jede Karte ist EIN kurzer Satz mit genau EINER Lücke "___".\n' +
      'Zu jeder Karte gehört eine UMSCHREIBUNG des gesuchten Wortes auf Deutsch – eine kindgerechte ' +
      'Erklärung, die das Wort NICHT nennt und es auch nicht direkt verrät.\n' +
      'Beispiel: Satz "Im Zoo haben wir ein großes ___ gesehen." Umschreibung: ' +
      '"Ein Lebewesen, das kein Mensch und keine Pflanze ist." Antwort: "Tier".\n' +
      'Der Lerner schreibt den GANZEN Satz mit gefülltem Wort ab.\n' +
      'Liefere ein Feld "cards": [ { "sentence": "... ___ ...", "hint": "Umschreibung", ' +
      '"answer": "das gesuchte Wort", "full": "der vollständige richtige Satz", ' +
      '"explanation": "kurze FRESCH-Erklärung" } ].\n' +
      'displayText und correctText bleiben leer – alles steckt in "cards".\n' +
      'instruction-Beispiel: "Schreibe jeden Satz vollständig ab und setze das passende Wort ein."',
  },

  // ─────────────── Weitere gewünschte Formate ───────────────
  {
    id: 'find_own_errors',
    label: 'Eigene Fehler finden',
    answerMode: 'canvas',
    guessRate: 0.15,
    suits: ALWAYS,
    spec:
      'EIGENE FEHLER FINDEN: Ein kurzer Text (3-4 Sätze), in den GENAU die Fehler eingebaut sind, ' +
      'die dieser Lerner laut Fehlerprofil und Wortliste selbst häufig macht. ' +
      'Nutze bevorzugt Wörter aus der übergebenen Wortliste (falls vorhanden). ' +
      'Der Lerner soll die Fehler finden und den Text richtig abschreiben.\n' +
      'instruction-Beispiel: "Hier stecken genau deine typischen Stolperstellen drin. Findest du sie?"',
  },
  {
    id: 'find_and_copy',
    label: 'Wörter finden',
    answerMode: 'canvas',
    guessRate: 0.10,
    suits: ALWAYS,
    spec:
      'WÖRTER FINDEN: Ein kurzer Text (4-6 Sätze), in dem 5-7 Wörter zum Fokus-Feature vorkommen. ' +
      'Der Lerner soll NUR diese Wörter heraussuchen und untereinander abschreiben – nicht den ganzen Text.\n' +
      'Der Text ist vollständig KORREKT geschrieben.\n' +
      'correctText enthält die gesuchten Wörter, durch Zeilenumbrüche getrennt, in Textreihenfolge.\n' +
      'instruction muss sagen, WONACH gesucht wird, ohne die Wörter zu nennen ' +
      '(z.B. "Schreibe alle Wörter heraus, die mit ie geschrieben werden.").',
  },
  {
    id: 'secret_code',
    label: 'Geheimschrift',
    answerMode: 'canvas',
    guessRate: 0.05,
    suits: ALWAYS,
    spec:
      'GEHEIMSCHRIFT: Ein kurzer Satz oder Zweizeiler (max. 12 Wörter), verschlüsselt mit EINER ' +
      'einfachen, im Text erklärten Regel. Erlaubte Regeln (wähle eine):\n' +
      '  - Rückwärts geschriebene Wörter ("reiT" = "Tier")\n' +
      '  - Jeder Vokal durch eine Zahl ersetzt (a=1, e=2, i=3, o=4, u=5)\n' +
      '  - Wörter ohne Leerzeichen aneinander ("ImZooistdasTier")\n' +
      'displayText = Regel + verschlüsselter Text. correctText = der entschlüsselte, korrekt ' +
      'geschriebene Text. Der Lerner entschlüsselt und schreibt richtig ab.\n' +
      'Die Verschlüsselung darf die Rechtschreibung NICHT unkenntlich machen – das Fokus-Feature ' +
      'muss beim Aufschreiben noch geübt werden.\n' +
      'instruction-Beispiel: "Knack den Code und schreibe den Satz richtig auf."',
  },

  // ─────────────── Fünf neue, schnelle Formate ───────────────
  // Drei davon bilden die FRESCH-Strategien direkt ab.
  {
    id: 'word_pyramid',
    label: 'Wortpyramide',
    answerMode: 'canvas',
    guessRate: 0.08,
    suits: (name) => RE_SILBE.test(name) || RE_AUSLAUT.test(name),
    // FRESCH-Strategie 1: Schwingen
    spec:
      'WORTPYRAMIDE: 3-4 kleine Pyramiden. Jede beginnt mit einer Silbe und wächst Stufe für Stufe ' +
      'zu einem längeren Wort (z.B. Tier / Tiere / Tierarzt / Tierarztpraxis).\n' +
      'displayText zeigt je Pyramide NUR die erste Stufe und die Anzahl der Stufen ' +
      '(z.B. "Tier → 4 Stufen"). Der Lerner schreibt die vollständige Pyramide untereinander.\n' +
      'correctText enthält alle Pyramiden, Stufen mit Zeilenumbruch, Pyramiden durch Leerzeile getrennt.\n' +
      'Trainiert das Sprechschwingen: beim Verlängern hört man die Silben.\n' +
      'instruction-Beispiel: "Baue jedes Wort Stufe für Stufe auf – sprich dabei in Silben."',
  },
  {
    id: 'lengthen_word',
    label: 'Verlängern',
    answerMode: 'canvas',
    guessRate: 0.10,
    suits: (name) => RE_AUSLAUT.test(name),
    // FRESCH-Strategie 2: Verlängern
    spec:
      'VERLÄNGERN: 6-8 einzelne Wörter, bei denen der letzte Laut nicht eindeutig ist ' +
      '(Berg, Hund, klug, Dieb, Korb ...). Der Lerner schreibt zu jedem Wort die verlängerte Form, ' +
      'die den Buchstaben hörbar macht (Berg → die Berge, klug → klüger, er schob → wir schoben).\n' +
      'displayText = die Ausgangswörter, durch Zeilenumbruch getrennt.\n' +
      'correctText = "Wort → verlängerte Form" je Zeile.\n' +
      'Das ist die FRESCH-Strategie "Verlängern" in Reinform – schnell und sehr wirksam.\n' +
      'instruction-Beispiel: "Verlängere jedes Wort, damit du den letzten Buchstaben hörst."',
  },
  {
    id: 'word_family',
    label: 'Wortfamilie',
    answerMode: 'canvas',
    guessRate: 0.08,
    suits: (name) => RE_ABLEITEN.test(name),
    // FRESCH-Strategie 3: Ableiten
    spec:
      'WORTFAMILIE: 3-4 Grundwörter. Zu jedem soll der Lerner 3 verwandte Wörter derselben ' +
      'Wortfamilie schreiben (Zahn → Zähne, zahnlos, Zahnarzt).\n' +
      'Wähle Grundwörter so, dass beim Ableiten genau das Fokus-Feature auftritt ' +
      '(z.B. a→ä, au→äu).\n' +
      'displayText = die Grundwörter. correctText = je Grundwort eine Zeile mit möglichen ' +
      'verwandten Wörtern (Komma-getrennt).\n' +
      'Das ist die FRESCH-Strategie "Ableiten".\n' +
      'instruction-Beispiel: "Finde zu jedem Wort drei Verwandte und schreibe sie auf."',
  },
  {
    id: 'sort_words',
    label: 'Sortieren',
    answerMode: 'canvas',
    guessRate: 0.45, // zwei Gruppen = faktisch Münzwurf
    suits: (name) => RE_BINAER.test(name),
    spec:
      'SORTIEREN: 8-10 Wörter (oder kurze Satzteile), die in ZWEI klar benannte Gruppen gehören ' +
      '(z.B. "mit ie" / "mit i", oder "das" / "dass"). Der Lerner schreibt zwei Listen untereinander.\n' +
      'displayText = die beiden Gruppennamen und darunter die gemischten Wörter, korrekt geschrieben.\n' +
      'correctText = beide Gruppen mit Überschrift und den zugehörigen Wörtern.\n' +
      'instruction-Beispiel: "Sortiere die Wörter in zwei Gruppen und schreibe sie ab."',
  },
  {
    id: 'sentence_from_words',
    label: 'Satz bauen',
    answerMode: 'canvas',
    guessRate: 0.08,
    suits: ALWAYS,
    spec:
      'SATZ BAUEN: 3-4 Aufgaben. Jede gibt 3 Wörter vor, aus denen EIN sinnvoller Satz gebaut ' +
      'werden soll, der alle drei enthält. Mindestens eines der Wörter enthält das Fokus-Feature.\n' +
      'displayText = je Aufgabe eine Zeile mit den drei Wörtern.\n' +
      'correctText = je Aufgabe ein Beispielsatz (es sind mehrere Lösungen möglich – das bei der ' +
      'Bewertung berücksichtigen).\n' +
      'Trainiert Anwendung im Zusammenhang: Groß-/Kleinschreibung und Satzschluss kommen mit dazu.\n' +
      'instruction-Beispiel: "Baue aus jeden drei Wörtern einen Satz."',
  },

  // ─────────────── Neun weitere Formate (aus Klasse-2-Material identifiziert) ───────────────
  {
    id: 'plural_singular',
    label: 'Einzahl/Mehrzahl',
    answerMode: 'canvas',
    guessRate: 0.08,
    suits: (name) => RE_NUMERUS.test(name) || ALWAYS(name),
    spec:
      'EINZAHL/MEHRZAHL: 8-10 Nomen, zur Hälfte in der Einzahl, zur Hälfte in der Mehrzahl ' +
      'vorgegeben. Der Lerner schreibt zu jedem die jeweils andere Form.\n' +
      'displayText = die vorgegebenen Wörter, durch Zeilenumbruch getrennt, mit Artikel bei der ' +
      'Einzahl (z.B. "der Baum").\n' +
      'correctText = "vorgegebene Form → gesuchte Form" je Zeile, Mehrzahl ohne Artikel.\n' +
      'Wähle Wörter mit uneinheitlicher Pluralbildung (nicht nur +e/+n), damit wirklich geübt wird.\n' +
      'instruction-Beispiel: "Schreibe zu jedem Wort die Einzahl oder die Mehrzahl auf."',
  },
  {
    id: 'compound_words',
    label: 'Wörter zusammensetzen',
    answerMode: 'canvas',
    guessRate: 0.08,
    suits: ALWAYS,
    spec:
      'WÖRTER ZUSAMMENSETZEN: 6-8 Paare aus zwei einfachen Nomen, die zusammen ein neues, ' +
      'sinnvolles Nomen ergeben (Schnee + Mann → Schneemann).\n' +
      'displayText = die Wortpaare, je Zeile "Wort1 + Wort2".\n' +
      'correctText = je Zeile das zusammengesetzte Wort (korrekt groß geschrieben, Fugen-s wo nötig).\n' +
      'Trainiert Wortbildung UND Groß-/Kleinschreibung von Nomen.\n' +
      'instruction-Beispiel: "Setze aus den zwei Wörtern jeweils ein neues Wort zusammen."',
  },
  {
    id: 'categorize_words',
    label: 'Einsortieren',
    answerMode: 'canvas',
    guessRate: 0.33, // drei Gruppen = eine von drei richtig raten
    suits: (name) => RE_BINAER.test(name) || RE_SILBE.test(name),
    spec:
      'EINSORTIEREN: 9-12 Wörter, die in GENAU DREI klar benannte Gruppen gehören ' +
      '(z.B. "aa" / "ee" / "oo", oder "Wochentage" / "Monate" / "Jahreszeiten"). ' +
      'Der Lerner schreibt drei Listen untereinander.\n' +
      'IMMER GENAU DREI Gruppen, nie mehr, nie weniger – bei zwei Gruppen stattdessen das ' +
      'Format "sort_words" verwenden. Nomen in den Wortlisten IMMER korrekt großschreiben.\n' +
      'displayText = die drei Gruppennamen und darunter die gemischten Wörter, korrekt geschrieben.\n' +
      'correctText = alle drei Gruppen mit Überschrift und den zugehörigen Wörtern.\n' +
      'instruction-Beispiel: "Sortiere die Wörter in die drei Gruppen und schreibe sie ab."',
  },
  {
    id: 'rhyme_pairs',
    label: 'Reimpaare',
    answerMode: 'canvas',
    guessRate: 0.10,
    suits: (name) => RE_SILBE.test(name),
    spec:
      'REIMPAARE: 6-8 Wörter, die sich paarweise reimen (Haus/Maus, Baum/Traum), gemischt ' +
      'vorgegeben. Der Lerner findet die Paare und schreibt sie zusammen auf.\n' +
      'displayText = alle Wörter gemischt (nicht paarweise sortiert), durch Kommas getrennt.\n' +
      'correctText = je Zeile ein gefundenes Reimpaar, "Wort1 – Wort2".\n' +
      'Reime müssen SAUBER sein (gleicher Auslaut), keine Fast-Reime. FRESCH-Schwingen: reimende ' +
      'Wörter klingen im Auslaut gleich, das hilft der Schreibweise.\n' +
      'instruction-Beispiel: "Finde immer zwei Wörter, die sich reimen, und schreibe sie zusammen auf."',
  },
  {
    id: 'syllable_join',
    label: 'Silben verbinden',
    answerMode: 'canvas',
    guessRate: 0.08,
    suits: (name) => RE_SILBE.test(name),
    spec:
      'SILBEN VERBINDEN: 6-8 Wörter, JEWEILS in ihre Silben zerlegt und in FALSCHER Reihenfolge ' +
      'vorgegeben (z.B. "tel – Ap – fel" für Apfel, "gar – Kinder – ten" für Kindergarten).\n' +
      'displayText = je Zeile die durcheinandergewürfelten Silben eines Wortes, durch " – " ' +
      'getrennt.\n' +
      'correctText = je Zeile das richtig zusammengesetzte Wort.\n' +
      'FRESCH-Schwingen in Reinform: das Wort entsteht erst durch das Sprechschwingen der Silben ' +
      'in der richtigen Reihenfolge.\n' +
      'instruction-Beispiel: "Bring die Silben in die richtige Reihenfolge und schreibe das Wort auf."',
  },
  {
    id: 'adjective_grading',
    label: 'Adjektive steigern',
    answerMode: 'canvas',
    guessRate: 0.12,
    suits: ALWAYS,
    spec:
      'ADJEKTIVE STEIGERN: 5-6 Adjektive in der Grundform. Der Lerner schreibt zu jedem die ' +
      'gesteigerte Form (Komparativ) und die höchste Form (Superlativ) dazu ' +
      '(schnell → schneller → am schnellsten).\n' +
      'Wähle bewusst 1-2 unregelmäßige dabei (gut → besser → am besten), aber mehrheitlich ' +
      'regelmäßige, damit das Muster trainiert wird.\n' +
      'displayText = die Grundformen, durch Zeilenumbruch getrennt.\n' +
      'correctText = je Zeile "Grundform – Komparativ – Superlativ".\n' +
      'instruction-Beispiel: "Steigere jedes Wort: erst mehr, dann am meisten."',
  },
  {
    id: 'verb_forms',
    label: 'Verbformen bilden',
    answerMode: 'canvas',
    guessRate: 0.12,
    suits: ALWAYS,
    spec:
      'VERBFORMEN BILDEN: 5-6 Verben in der Grundform. Der Lerner schreibt zu jedem die ' +
      'passende Form für EINE vorgegebene Person (z.B. "ich", "du", "wir") in der Gegenwart, ' +
      'oder die einfache Vergangenheitsform – wähle EINE Vorgabe für die ganze Übung, nicht ' +
      'gemischt.\n' +
      'displayText = "Grundform (Vorgabe, z.B. ich)" je Zeile, z.B. "spielen (ich)".\n' +
      'correctText = je Zeile "Grundform → gebildete Form", z.B. "spielen → ich spiele".\n' +
      'instruction-Beispiel: "Schreibe zu jedem Verb die passende Form auf."',
  },
  {
    id: 'sentence_type_transform',
    label: 'Satzart umwandeln',
    answerMode: 'canvas',
    guessRate: 0.15,
    suits: (name) => RE_ZEICHEN.test(name),
    spec:
      'SATZART UMWANDELN: 4-5 Aussagesätze. Der Lerner formt jeden in eine Frage um (oder ' +
      'umgekehrt bei Fragesätzen in eine Aussage) und schreibt den neuen Satz MIT korrektem ' +
      'Satzschlusszeichen.\n' +
      'displayText = die Ausgangssätze, durch Zeilenumbruch getrennt.\n' +
      'correctText = je Zeile der umgeformte Satz mit korrektem Satzzeichen (? bzw. .).\n' +
      'Trainiert: Satzzeichen richtig nach Satzart setzen, nicht nur mechanisch abschreiben.\n' +
      'instruction-Beispiel: "Mach aus jedem Satz eine Frage – denk an das richtige Satzzeichen."',
  },
  {
    id: 'letter_grid',
    label: 'Buchstabengitter',
    answerMode: 'canvas',
    guessRate: 0.05,
    suits: ALWAYS,
    spec:
      'BUCHSTABENGITTER: Ein 8x8-Raster aus Buchstaben, in das 6-8 Wörter zum Fokus-Feature ' +
      'waagerecht oder senkrecht (nicht diagonal, nicht rückwärts) versteckt sind, Rest mit ' +
      'zufälligen Füll-Buchstaben aufgefüllt. Der Lerner findet die Wörter und schreibt sie auf ' +
      '(nicht das ganze Gitter abschreiben).\n' +
      'displayText = das Raster, Zeile für Zeile, Buchstaben durch Leerzeichen getrennt.\n' +
      'correctText = die versteckten Wörter, durch Zeilenumbruch getrennt, in Fundreihenfolge ' +
      '(oben-links beginnend).\n' +
      'instruction-Beispiel: "Finde die versteckten Wörter im Gitter und schreibe sie auf."',
  },
];

const BY_ID = Object.fromEntries(TYPES.map((t) => [t.id, t]));

/** Alle Formate, die zu einer Fehler-Kategorie passen. */
function typesForFeature(featureName = '') {
  const fits = TYPES.filter((t) => t.suits(featureName));
  // Sicherheitsnetz: es gibt immer die universellen Formate
  return fits.length ? fits : TYPES.filter((t) => t.suits === ALWAYS);
}

/**
 * Wählt das nächste Format: passend zur Kategorie und möglichst abwechslungsreich.
 * @param {string} featureName  aktuelles Fokus-Feature
 * @param {string[]} recentIds  zuletzt genutzte Formate (neueste zuerst)
 */
function pickType(featureName, recentIds = []) {
  const candidates = typesForFeature(featureName);
  // Zuletzt genutzte hinten anstellen, damit sich nichts wiederholt
  const scored = candidates.map((t) => {
    const idx = recentIds.indexOf(t.id);
    return { t, staleness: idx === -1 ? 999 : idx };
  });
  scored.sort((a, b) => b.staleness - a.staleness);
  // Unter den am längsten nicht genutzten zufällig wählen (Abwechslung)
  const best = scored.filter((s) => s.staleness === scored[0].staleness);
  return best[Math.floor(Math.random() * best.length)].t;
}

const getType = (id) => BY_ID[id] || null;
const allIds = () => TYPES.map((t) => t.id);
/** Ratechance eines Formats – Zeichensetzung überschreibt (immer ~Münzwurf). */
function guessRateFor(typeId, featureName = '') {
  if (RE_ZEICHEN.test(featureName)) return 0.45;
  return BY_ID[typeId]?.guessRate ?? 0.12;
}

const STORY_TYPES = ['cloze_text', 'error_text', 'audio_dictation', 'find_own_errors', 'find_and_copy'];

/**
 * Qualitäts-/Stil-Regeln, die für JEDE Übungserzeugung gelten – egal ob live
 * in /api/next-exercise oder offline beim Vorab-Erzeugen aus abstrakten
 * Vorlagen (scripts/inspire-exercise-bank.js). Ein Ort, damit beide Wege
 * garantiert denselben Standard einhalten.
 */
function globalRules(typeId) {
  return (
    'GLOBAL KRITISCHE REGELN (gelten IMMER):\n' +
    '- Aufgabenstellung (instruction) darf NIEMALS die Lösung verraten. ' +
    'Erwähne NIE konkrete Wörter aus dem Text. Schlechtes Beispiel: "Wie schreibt man Zoo-Tier?".\n' +
    (STORY_TYPES.includes(typeId)
      ? '- Der Text MUSS eine kohärente kleine Geschichte oder Beobachtung sein. ' +
        'Sätze nehmen aufeinander Bezug, keine zusammenhanglosen Einzelsätze.\n'
      : '- Die Beispiele sollen alltagsnah und für die Klassenstufe vertraut sein.\n') +
    '- Wortschatz und Komplexität GENAU passend zur Klassenstufe.\n' +
    '- KEINE englischen Begriffe, KEINE Anglizismen, KEINE Bindestrich-Komposita ("Start-Ups", ' +
    '"E-Mail", "Hands-On") – die machen rechtschreiblich keinen Sinn als Übung.\n' +
    '- KEINE Eigennamen mit Sonderschreibung (z.B. "iPhone", "McDonald\'s") – nur deutsche ' +
    'Alltagswörter, die ein Schüler dieser Klasse aktiv schreiben sollte.\n' +
    '- Vor der finalen Antwort PRÜFE selbst: Würde ein Lehrer diese Übung im Heft akzeptieren? ' +
    'Wenn nein, formuliere um.\n\n'
  );
}

module.exports = {
  TYPES, BY_ID, typesForFeature, pickType, getType, allIds, guessRateFor, globalRules,
};
