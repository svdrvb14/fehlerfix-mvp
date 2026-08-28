/**
 * Übungsbank aus fremdem Lehrmaterial befüllen – OHNE dessen Inhalte zu
 * übernehmen. Für Quellen, die ihr nicht direkt digitalisieren dürft
 * (z.B. gekaufte Verlags-Lehrwerke ohne Partnervertrag).
 *
 * ZWEI GETRENNTE KI-AUFRUFE PRO SEITE ("Clean Room"-Prinzip):
 *
 *   Schritt A – STRUKTUR-SCANNER (sieht die Quellseite)
 *     Liest die Seite, gibt NUR abstrakte Eckdaten zurück: Übungsformat,
 *     Fehlerkategorie, Klassenstufe, grobes Themenfeld, Schwierigkeitsgrad.
 *     Ausdrücklich verboten: wörtliche Sätze, Wörter, Namen oder Beispiele
 *     aus der Vorlage.
 *
 *   Schritt B – VERFASSER (sieht die Quellseite NIEMALS)
 *     Bekommt AUSSCHLIESSLICH die abstrakten Eckdaten aus Schritt A als
 *     Text – kein Bild, kein Auszug, keine Vorlage im Kontext. Schreibt
 *     eine komplett neue, eigene "FehlerFix-Übung" dazu, mit denselben
 *     Format-Regeln wie die Live-Erzeugung in /api/next-exercise
 *     (lib/exercises.js – dieselbe Quelle, kein zweiter Prompt-Stand).
 *
 * Das Ergebnis aus Schritt B ist eigenständig erzeugter Inhalt – die
 * Vorlage hat auf ihn keinen direkten Einfluss außer über die Idee/Struktur
 * (Format, Thema, Schwierigkeitsgrad), was rechtlich frei ist. Jede
 * gespeicherte Übung trägt generation_method='inspired' plus die Struktur
 * aus Schritt A (structure_source) – nachvollziehbar, dass nie ein
 * wörtlicher Satz aus der Quelle in den zweiten Schritt gelangt ist.
 *
 * Nutzung:
 *   node scripts/inspire-exercise-bank.js <Ordner> [--grade 3]
 *
 * Grenzen wie bei ingest-exercise-bank.js: PDFs bis 32 MB / 600 Seiten pro
 * Datei, sonst vorher aufteilen.
 */
require('dotenv').config({ override: true });
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');
const { supabase, isDbEnabled } = require('../lib/db');
const { TYPES, globalRules } = require('../lib/exercises');

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MODEL = /^claude-/i.test(process.env.CLAUDE_MODEL || '') ? process.env.CLAUDE_MODEL.trim() : DEFAULT_MODEL;
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

const SOURCE_FORMATS = TYPES.filter((t) => t.answerMode === 'canvas').map((t) => t.id);

function parseArgs(argv) {
  const folder = argv[2];
  if (!folder) {
    console.error('Nutzung: node scripts/inspire-exercise-bank.js <Ordner> [--grade N]');
    process.exit(1);
  }
  let grade = null;
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === '--grade') grade = Number(argv[++i]) || null;
  }
  return { folder, grade };
}

function parseJsonResponse(rawText) {
  let cleaned = (rawText || '').trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) cleaned = cleaned.slice(first, last + 1);
  return JSON.parse(cleaned);
}

function normTag(s) {
  return String(s || '').toLowerCase().trim().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
}

function fileToBlock(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const data = fs.readFileSync(filePath).toString('base64');
  if (ext === '.pdf') {
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } };
  }
  const mediaType = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[ext];
  if (!mediaType) return null;
  return { type: 'image', source: { type: 'base64', media_type: mediaType, data } };
}

// ─── Schritt A: Struktur-Scanner (sieht die Quellseite) ───────────────
async function extractStructures(filePath, defaultGrade) {
  const block = fileToBlock(filePath);
  if (!block) {
    console.warn(`  übersprungen (unbekannter Dateityp): ${filePath}`);
    return [];
  }

  const prompt =
    'Du siehst eine oder mehrere Seiten aus einem Rechtschreib-Lehrwerk, das FehlerFix ' +
    'NICHT direkt verwenden darf (kein Lizenzvertrag mit dem Verlag). Du bist der erste ' +
    'Schritt einer "Clean Room"-Pipeline: du gibst NUR die abstrakte STRUKTUR jeder Übung ' +
    'zurück, damit ein SPÄTERER, komplett getrennter Schritt (der diese Seite nie sieht) ' +
    'daraus eine eigene, neue Übung schreiben kann.\n\n' +
    'STRIKT VERBOTEN in deiner Antwort:\n' +
    '- Wörtliche oder nahezu wörtliche Sätze aus der Vorlage\n' +
    '- Konkrete Beispielwörter, Eigennamen oder Figuren aus der Vorlage\n' +
    '- Jede Formulierung, die man als Zitat der Vorlage erkennen würde\n\n' +
    'ERLAUBT UND GEWÜNSCHT (reine Struktur/Idee, kein Urheberrecht):\n' +
    '- Welches Übungsformat vorliegt\n' +
    '- Welche Rechtschreib-/Grammatik-Kategorie geübt wird\n' +
    '- Klassenstufe, falls erkennbar\n' +
    '- Ein GROBES, allgemeines Themenfeld (z.B. "Tiere", "Herbst", "Schulalltag" – ' +
    'niemals ein Zitat oder eine spezifische Formulierung)\n' +
    '- Schwierigkeitsgrad und grobe Struktur (z.B. "Lückentext mit 7 Lücken", ' +
    '"Fehlertext mit 5 Fehlern")\n\n' +
    `Erlaubte Formate (nur diese IDs): ${SOURCE_FORMATS.join(', ')}\n` +
    'Passt eine gefundene Übung zu keinem Format, LASS SIE WEG.\n\n' +
    'Antworte AUSSCHLIESSLICH als JSON:\n' +
    '{ "specs": [ { "format": "...", "feature_tags": ["..."], "grade": N|null, ' +
    '"topic": "<allgemeines Themenfeld, KEIN Zitat>", "difficulty": "leicht|mittel|schwer", ' +
    '"structure_hint": "<z.B. \'Lückentext mit 7 Lücken\'>", "source_page": N|null, ' +
    '"no_verbatim_content": true } ] }\n' +
    'no_verbatim_content muss true sein – wenn du merkst, dass du wörtlichen Inhalt ' +
    'wiedergeben würdest, lass diesen Eintrag stattdessen ganz weg.';

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system:
      'Du extrahierst AUSSCHLIESSLICH abstrakte Struktur, niemals wörtlichen Inhalt. ' +
      'Du antwortest ausschließlich mit gültigem JSON.',
    messages: [{ role: 'user', content: [block, { type: 'text', text: prompt }] }],
  });
  const text = response.content.find((b) => b.type === 'text')?.text || '';
  const parsed = parseJsonResponse(text);
  const list = Array.isArray(parsed.specs) ? parsed.specs : [];

  return list
    .filter((s) => s && SOURCE_FORMATS.includes(s.format) && s.no_verbatim_content !== false)
    .map((s) => ({
      format: s.format,
      feature_tags: (Array.isArray(s.feature_tags) ? s.feature_tags : [s.feature_tags]).filter(Boolean).map(normTag),
      grade: Number(s.grade) || defaultGrade || null,
      topic: String(s.topic || '').trim(),
      difficulty: ['leicht', 'mittel', 'schwer'].includes(s.difficulty) ? s.difficulty : 'mittel',
      structure_hint: String(s.structure_hint || '').trim(),
      source_page: Number(s.source_page) || null,
      source_file: path.basename(filePath),
    }));
}

// ─── Schritt B: Verfasser (sieht die Quellseite NIE) ──────────────────
async function writeExercise(spec) {
  const type = TYPES.find((t) => t.id === spec.format);
  if (!type) return null;

  const prompt =
    'Du erstellst EINE komplett neue, eigenständige handschriftliche Rechtschreibübung ' +
    'für FehlerFix. Du hast KEINEN Zugriff auf irgendeine Vorlage oder Quelle – du kennst ' +
    'nur die folgende abstrakte Vorgabe und schreibst alles selbst, frei und original:\n\n' +
    `Klassenstufe: ${spec.grade || 'nicht angegeben, wähle altersgerecht für Grundschule/weiterführend'}\n` +
    `Fehlerkategorie: ${spec.feature_tags.join(', ') || spec.topic}\n` +
    `Themenfeld: ${spec.topic || 'frei wählbar, alltagsnah'}\n` +
    `Schwierigkeitsgrad: ${spec.difficulty}\n` +
    `Struktur: ${spec.structure_hint || 'siehe Formatbeschreibung unten'}\n\n` +
    type.spec + '\n\n' +
    globalRules(spec.format) +
    'ANTWORT AUSSCHLIESSLICH ALS JSON:\n' +
    '{\n' +
    `  "topic": "<kurzes Schlagwort für die Überschrift>",\n` +
    '  "instruction": "<altersgerechte Aufgabenstellung OHNE Antworten zu verraten>",\n' +
    '  "tips": ["<Achtsamkeit 1>", "<Achtsamkeit 2>", "<Achtsamkeit 3>"],\n' +
    '  "displayText": "<Material – siehe Formatbeschreibung; leer bei audio_dictation>",\n' +
    '  "correctText": "<vollständig korrekte Lösung>",\n' +
    '  "explanation": "<1-2 Sätze zur Regel>",\n' +
    '  "quality_ok": true|false,\n' +
    '  "quality_reason": "<nur bei quality_ok=false: kurz warum>"\n' +
    '}';

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system:
      'Du erstellst gezielte, altersgerechte Rechtschreibübungen von Grund auf neu. ' +
      'Du antwortest ausschließlich mit gültigem JSON.',
    messages: [{ role: 'user', content: prompt }],
  });
  const text = response.content.find((b) => b.type === 'text')?.text || '';
  const ex = parseJsonResponse(text);
  if (!ex.displayText && spec.format !== 'audio_dictation') return null;
  if (!ex.correctText) return null;

  return {
    grade: spec.grade,
    format: spec.format,
    feature_tags: spec.feature_tags,
    topic: ex.topic || spec.topic || null,
    instruction: ex.instruction || '',
    tips: Array.isArray(ex.tips) ? ex.tips : [],
    display_text: ex.displayText || '',
    correct_text: ex.correctText,
    cards: null,
    explanation: ex.explanation || '',
    source_file: spec.source_file,
    source_page: spec.source_page,
    quality_ok: ex.quality_ok !== false,
    reviewed: ex.quality_ok !== false,
    generation_method: 'inspired',
    structure_source: spec, // Nachvollziehbarkeit: genau das ist alles, was der Verfasser wusste
  };
}

async function main() {
  const { folder, grade } = parseArgs(process.argv);
  if (!anthropic) { console.error('ANTHROPIC_API_KEY fehlt (.env prüfen).'); process.exit(1); }
  if (!isDbEnabled) { console.error('Supabase nicht konfiguriert (.env prüfen).'); process.exit(1); }

  const files = fs.readdirSync(folder)
    .filter((f) => /\.(pdf|png|jpe?g|webp)$/i.test(f))
    .map((f) => path.join(folder, f));
  if (!files.length) { console.error(`Keine PDF/Bild-Dateien in ${folder} gefunden.`); process.exit(1); }

  console.log(`${files.length} Datei(en). Modell: ${MODEL}. Zwei KI-Aufrufe pro Übung (Struktur + Verfasser).\n`);

  let totalSpecs = 0;
  let totalWritten = 0;
  let flagged = 0;
  const tagCounts = {};

  for (const file of files) {
    process.stdout.write(`→ ${path.basename(file)} `);
    let specs = [];
    try {
      specs = await extractStructures(file, grade);
    } catch (err) {
      console.log(`FEHLER bei Struktur-Erkennung: ${err.message}`);
      continue;
    }
    if (!specs.length) { console.log('– keine passenden Übungen erkannt.'); continue; }
    totalSpecs += specs.length;
    process.stdout.write(`(${specs.length} Struktur${specs.length === 1 ? '' : 'en'}) → schreibe... `);

    const rows = [];
    for (const spec of specs) {
      try {
        const row = await writeExercise(spec);
        if (row) rows.push(row);
      } catch (err) {
        console.log(`\n  FEHLER beim Verfassen (${spec.format}): ${err.message}`);
      }
    }
    if (!rows.length) { console.log('nichts Verwertbares.'); continue; }

    const { error } = await supabase.from('exercise_bank').insert(rows);
    if (error) { console.log(`FEHLER beim Speichern: ${error.message}`); continue; }

    totalWritten += rows.length;
    for (const r of rows) {
      if (!r.quality_ok) flagged++;
      for (const t of r.feature_tags) tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
    console.log(`${rows.length} Übung(en) gespeichert.`);
  }

  console.log('\n─── Zusammenfassung ───────────────────────');
  console.log(`Strukturen erkannt:  ${totalSpecs}`);
  console.log(`Übungen geschrieben: ${totalWritten}`);
  console.log(`Zur Kontrolle (reviewed=false): ${flagged}`);
  console.log('Kategorien:');
  Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).forEach(([tag, n]) => console.log(`  ${tag}: ${n}`));
  console.log(
    '\nJede Zeile hat generation_method=\'inspired\' + structure_source – so ist jederzeit ' +
    'nachvollziehbar, dass der Verfasser-Schritt nie die Originalseite gesehen hat.'
  );
}

main().catch((err) => { console.error(err); process.exit(1); });
