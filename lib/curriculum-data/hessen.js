/**
 * Hessisches Kerncurriculum – Deutsch.
 *
 * Strukturierte Zusammenfassung der Bildungsstandards für „Schreiben –
 * Rechtschreibung" pro Schulform und Jahrgangsstufen-Bereich. Quellen:
 *   - Kerncurriculum Hessen Primarstufe Deutsch (2011)
 *   - Kerncurriculum Hessen Sekundarstufe I Hauptschule/Realschule/Gymnasium Deutsch
 *   - Leitfäden Deutsch Primarstufe / Sekundarstufe I
 *   - Kerncurriculum Gymnasiale Oberstufe Deutsch (Ausgabe 2024)
 *   - Kerncurriculum Fachoberschule Deutsch (2022)
 *
 * Die Originaldaten sind kompetenzorientiert formuliert und enthalten keine
 * Wörter- oder Themenliste je Jahrgangsstufe – das ist Aufgabe der Lehrwerke.
 * Wir geben der KI hier die offiziellen Standards + die fachüblichen
 * Schwerpunkte pro Klassenbereich, sodass sie Übungen passend zur Stufe
 * generiert.
 *
 * Sobald Verlags-Daten (Cornelsen, Klett etc.) via Partner-API verfügbar sind,
 * werden die `textbook`- und `topics`-Felder konkreter befüllt.
 */

const SOURCE_PRIMAR = 'Hessisches Kerncurriculum Primarstufe Deutsch (2011)';
const SOURCE_SEK1 = 'Hessisches Kerncurriculum Sekundarstufe I Deutsch';
const SOURCE_OBER = 'Hessisches Kerncurriculum gymnasiale Oberstufe Deutsch (2024)';
const SOURCE_FOS = 'Hessisches Kerncurriculum Fachoberschule Deutsch (2022)';

// Strukturierte Datenbank: schoolType → gradeRange → curriculum
const HESSEN = {
  Grundschule: {
    source: SOURCE_PRIMAR,
    ranges: [
      {
        grades: [1, 2],
        focus: 'Alphabetische Strategie + erste orthographische Muster',
        topics: [
          'Laut-Buchstaben-Zuordnung (lautgetreues Schreiben)',
          'Selbstlaute (a, e, i, o, u) und Mitlaute unterscheiden',
          'Großschreibung am Satzanfang',
          'Großschreibung von Nomen (Einführung)',
          'Satzschlusszeichen (. ! ?)',
          'Erste Doppelkonsonanten nach kurzem Vokal',
        ],
        strategies: ['Schwingen'],
      },
      {
        grades: [3, 4],
        focus: 'Orthographische + morphematische Strategie ausbauen',
        topics: [
          'Doppelkonsonanten (Sommer, rennen, Tatze)',
          'ie/i-Schreibung (langer i-Laut)',
          'ck und tz nach kurzem Vokal',
          'Auslautverhärtung (Berg/Hund/Tag) → Verlängern',
          'ä/e- und äu/eu-Ableitungen',
          'Dehnungs-h (fahren, nehmen) – als Merkwörter',
          'Großschreibung von Nomen (sicher)',
          'Zeichen der wörtlichen Rede',
          'Wortfamilien erkennen (Hand → Hände, händisch)',
          'Erste Komma-Regeln (Aufzählungen)',
        ],
        strategies: ['Schwingen', 'Verlängern', 'Ableiten', 'Merken'],
      },
    ],
  },

  Hauptschule: {
    source: SOURCE_SEK1,
    ranges: [
      {
        grades: [5, 6],
        focus: 'Festigung der Grundschul-Strategien + Erweiterung',
        topics: [
          'das/dass (Konjunktion vs. Artikel/Pronomen)',
          'Komma bei Aufzählungen und Nebensätzen',
          'seid/seit (Verb vs. Zeitangabe)',
          'wider/wieder (gegen vs. erneut)',
          's/ss/ß-Schreibung nach langem/kurzem Vokal',
          'Großschreibung substantivierter Verben/Adjektive (das Lesen, das Gute)',
          'Worttrennung am Zeilenende',
          'Sprachliche Richtigkeit in zusammenhängenden Texten',
        ],
        strategies: ['Schwingen', 'Verlängern', 'Ableiten', 'Merken'],
      },
      {
        grades: [7, 8, 9],
        focus: 'Anwendung in komplexeren Texten + Selbstkorrektur',
        topics: [
          'Zusammen- und Getrenntschreibung (Verben mit Präposition)',
          'Komma bei erweitertem Infinitiv mit zu',
          'Komma bei Konjunktionen (weil, dass, obwohl, wenn)',
          'Fremdwörter (häufig vorkommende)',
          'Anredepronomen (Sie, Ihr, Ihre)',
          'Zeichen der wörtlichen Rede (kombiniert mit Begleitsatz)',
          'Selbstständige Fehlerkorrektur mit Strategien und Nachschlagewerken',
        ],
        strategies: ['Verlängern', 'Ableiten', 'Merken'],
      },
    ],
  },

  Realschule: {
    source: SOURCE_SEK1,
    ranges: [
      {
        grades: [5, 6],
        focus: 'Festigung + Erweiterung der Strategien',
        topics: [
          'das/dass sicher anwenden',
          'Komma bei Aufzählungen, Anreden, Nebensätzen',
          'seid/seit, wider/wieder',
          's/ss/ß-Schreibung',
          'Großschreibung substantivierter Wortarten',
          'Worttrennung',
          'Anredepronomen',
        ],
        strategies: ['Schwingen', 'Verlängern', 'Ableiten', 'Merken'],
      },
      {
        grades: [7, 8, 9, 10],
        focus: 'Selbstständiges richtiges Schreiben + Fachsprache',
        topics: [
          'Zusammen- und Getrenntschreibung',
          'Komma bei erweitertem Infinitiv mit zu',
          'Komma bei mehrteiligen Konjunktionen',
          'Häufige Fremdwörter (auch Fachbegriffe)',
          'Zeichen der wörtlichen Rede (vor-, nach-, eingeschoben)',
          'Schreibung von Datum, Uhrzeit, Anschriften (Geschäftsbrief)',
          'Eigene Texte auf Rechtschreibung prüfen',
        ],
        strategies: ['Verlängern', 'Ableiten', 'Merken'],
      },
    ],
  },

  Gymnasium: {
    source: SOURCE_SEK1,
    ranges: [
      {
        grades: [5, 6],
        focus: 'Konsolidierung der Strategien + erste komplexere Regeln',
        topics: [
          'das/dass mit Begründung',
          'Komma bei Aufzählungen, Nebensätzen, eingeschobenen Sätzen',
          'seid/seit, wider/wieder, dass/das, wie/als',
          's/ss/ß sicher beherrschen',
          'Großschreibung substantivierter Wortarten',
          'Worttrennung nach Sprechsilben',
          'Großschreibung von Anredepronomen (Sie/Ihr)',
        ],
        strategies: ['Schwingen', 'Verlängern', 'Ableiten', 'Merken'],
      },
      {
        grades: [7, 8],
        focus: 'Komplexe Satzstrukturen + Zeichensetzung sicher',
        topics: [
          'Zusammen- und Getrenntschreibung (Verben/Adjektive mit Präposition/Adverb)',
          'Komma bei erweitertem Infinitiv mit zu',
          'Komma bei nebenordnenden Konjunktionen',
          'Apposition (Komma um Beifügungen)',
          'Schreibung von Fremdwörtern (Latinismen, Anglizismen mit Eindeutschung)',
          'Indirekte Rede',
        ],
        strategies: ['Verlängern', 'Ableiten', 'Merken'],
      },
      {
        grades: [9, 10],
        focus: 'Stilistische Sicherheit + Normbewusstsein',
        topics: [
          'Sicherheit in allen orthographischen Bereichen',
          'Bewusster Umgang mit Fremdwortschreibung',
          'Komma bei Partizipialgruppen',
          'Geschäftliche und formelle Schreibungen (Bewerbung, Geschäftsbrief)',
          'Eigene Texte selbstständig redigieren',
        ],
        strategies: ['Ableiten', 'Merken'],
      },
    ],
  },

  Gesamtschule: {
    source: SOURCE_SEK1,
    note: 'Gesamtschule deckt je nach Bildungsgang Hauptschul-, Realschul- und Gymnasialniveau ab. Wir empfehlen die Schulform-Auswahl nach angestrebtem Abschluss.',
    ranges: [
      {
        grades: [5, 6, 7, 8, 9, 10],
        focus: 'Differenziert nach Bildungsgang (HS/RS/Gym)',
        topics: [
          'das/dass, seid/seit, wider/wieder',
          's/ss/ß-Schreibung',
          'Komma bei Aufzählungen, Nebensätzen, Konjunktionen',
          'Zusammen- und Getrenntschreibung',
          'Großschreibung substantivierter Wortarten',
          'Häufige Fremdwörter',
          'Zeichen der wörtlichen Rede',
        ],
        strategies: ['Schwingen', 'Verlängern', 'Ableiten', 'Merken'],
      },
    ],
  },

  'Berufsschule': {
    source: SOURCE_FOS,
    ranges: [
      {
        grades: [11, 12],
        focus: 'Berufs- und alltagsbezogene Schreibsicherheit',
        topics: [
          'Sicherheit in formellen Texten (Bewerbung, Geschäftskorrespondenz)',
          'Fremdwortschreibung in Fachsprache',
          'Komma in komplexen Satzgefügen',
          'Konsistenz in zusammenhängenden Texten',
          'Selbstkorrektur nach normativen Regeln',
        ],
        strategies: ['Ableiten', 'Merken'],
      },
    ],
  },
};

// Mapping „Berufsschule / BBS" aus Frontend auf den Eintrag
HESSEN['Berufsschule / BBS'] = HESSEN['Berufsschule'];

/**
 * Holt strukturierten Curriculum-Eintrag für ein Profil.
 * @param {object} profile - { state, grade, schoolType }
 * @returns {object|null}
 */
function lookup(profile) {
  if (!profile || profile.state !== 'HE') return null;
  const school = HESSEN[profile.schoolType];
  if (!school) return null;
  const range = school.ranges.find((r) => r.grades.includes(Number(profile.grade)));
  if (!range) return null;
  return {
    source: school.source,
    note: school.note || null,
    focus: range.focus,
    topics: range.topics,
    strategies: range.strategies,
  };
}

module.exports = { lookup, HESSEN };
