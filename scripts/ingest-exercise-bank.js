/**
 * Übungsbank befüllen: liest gescannte Lehrmaterial-Seiten (Bilder oder PDFs)
 * aus einem Ordner, lässt Claude jede einzelne Übung strukturiert herausziehen
 * und speichert sie in `exercise_bank`.
 *
 * Wichtig: Hier wird GEDRUCKTER Text gelesen (kein Kinder-Handschrift-OCR) –
 * das ist für die KI ein leichtes, sehr zuverlässiges Problem. Trotzdem prüft
 * jede Extraktion sich selbst (quality_ok) und markiert unsichere Fälle für
 * eine kurze menschliche Kontrolle, statt sie ungeprüft live zu schalten.
 *
 * Nutzung:
 *   node scripts/ingest-exercise-bank.js <Ordner> [--grade 3] [--state Hessen]
 *
 * Der Ordner darf Bilder (jpg/png, eine Seite pro Datei) und/oder PDFs
 * (mehrere Seiten pro Datei, siehe Grenzen unten) gemischt enthalten.
 * Klassenstufe wird pro Seite erkannt, wenn im Material sichtbar – sonst
 * greift --grade als Vorgabe.
 *
 * PDF-Grenzen (Anthropic-API): max. 32 MB pro Anfrage, max. 600 Seiten.
 * Größere Werke vorher in Kapitel-PDFs aufteilen (z.B. mit `pdftk` oder
 * Vorschau/Preview „Seiten extrahieren").
 */
require('dotenv').config({ override: true });
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');
const { supabase, isDbEnabled } = require('../lib/db');
const { TYPES } = require('../lib/exercises');

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MODEL = /^claude-/i.test(process.env.CLAUDE_MODEL || '') ? process.env.CLAUDE_MODEL.trim() : DEFAULT_MODEL;

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

// picture_sentence ausgeschlossen: braucht lib/imagelibrary.js als Kontext, aber
// dieses Skript ruft Claude ohne Werkzeug-Zugriff auf – kann die Datei nicht lesen,
// würde also Bild-Schlüssel erfinden. Nur die Agent-Pipeline (mit Read-Tool) darf das Format nutzen.
const SOURCE_FORMATS = TYPES.filter((t) => t.answerMode === 'canvas' && t.id !== 'picture_sentence').map((t) => t.id);
// flashcards/audio_dictation nicht aus Quellmaterial extrahieren – die brauchen
// Laufzeit-Verhalten (Kartenwischen, TTS), das aus einer Buchseite nicht hervorgeht.

function parseArgs(argv) {
  const folder = argv[2];
  if (!folder) {
    console.error('Nutzung: node scripts/ingest-exercise-bank.js <Ordner> [--grade N] [--state Name]');
    process.exit(1);
  }
  let grade = null;
  let state = null;
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === '--grade') grade = Number(argv[++i]) || null;
    if (argv[i] === '--state') state = argv[++i] || null;
  }
  return { folder, grade, state };
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

async function extractFromFile(filePath, defaultGrade) {
  const block = fileToBlock(filePath);
  if (!block) {
    console.warn(`  übersprungen (unbekannter Dateityp): ${filePath}`);
    return [];
  }

  const prompt =
    'Du siehst eine oder mehrere Seiten aus einem deutschen Rechtschreib-Lehrwerk ' +
    '(Grundschule/weiterführende Schule). Extrahiere JEDE einzelne Übung, die du findest.\n\n' +
    `Erlaubte Übungsformate (nur diese IDs verwenden): ${SOURCE_FORMATS.join(', ')}\n` +
    'Ordne jede gefundene Übung dem am besten passenden Format zu. Passt eine Übung zu ' +
    'keinem der Formate, LASS SIE WEG statt sie zu verbiegen.\n\n' +
    'Für jede Übung:\n' +
    '- format: eine der erlaubten IDs\n' +
    '- topic: kurzes Schlagwort für die Überschrift (z.B. "ie/i-Schreibung")\n' +
    '- feature_tags: 1-2 normalisierte Fehlerkategorien (kleingeschrieben, z.B. ' +
    '"ie/i-schreibung", "auslautverhärtung", "groß-/kleinschreibung von nomen")\n' +
    '- instruction: die Aufgabenstellung, altersgerecht umformuliert falls nötig\n' +
    '- tips: 2-3 kurze Achtsamkeiten fürs Kind\n' +
    '- display_text: das Material, das dem Kind gezeigt wird (Lückentext, Fehlertext, ' +
    'Wortliste je nach Format – GENAU wie im Original, keine Lücken erfinden, die nicht da sind)\n' +
    '- correct_text: die vollständig korrekte Lösung\n' +
    '- explanation: 1-2 Sätze zur Regel (falls im Material erklärt, sonst kurz selbst formuliert)\n' +
    '- grade: Klassenstufe, NUR wenn im Material sichtbar angegeben – sonst null\n' +
    '- source_page: Seitenzahl, falls erkennbar – sonst null\n' +
    '- quality_ok: true, wenn du dir bei der Übertragung sicher bist; false, wenn Text ' +
    'unklar/unvollständig lesbar war oder etwas unsicher ist\n' +
    '- quality_reason: bei quality_ok=false kurz warum\n\n' +
    'Antworte AUSSCHLIESSLICH als JSON: { "exercises": [ { ... }, ... ] }\n' +
    'Keine Übungen erfinden. Wenn die Seite keine Übung enthält, gib eine leere Liste zurück.';

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: 'Du digitalisierst Lehrmaterial präzise und ohne etwas hinzuzuerfinden. Du antwortest ausschließlich mit gültigem JSON.',
    messages: [{ role: 'user', content: [block, { type: 'text', text: prompt }] }],
  });
  const text = response.content.find((b) => b.type === 'text')?.text || '';
  const parsed = parseJsonResponse(text);
  const list = Array.isArray(parsed.exercises) ? parsed.exercises : [];

  return list
    .filter((e) => e && SOURCE_FORMATS.includes(e.format) && e.display_text && e.correct_text)
    .map((e) => ({
      grade: Number(e.grade) || defaultGrade || null,
      format: e.format,
      feature_tags: (Array.isArray(e.feature_tags) ? e.feature_tags : [e.feature_tags]).filter(Boolean).map(normTag),
      topic: e.topic || null,
      instruction: e.instruction || '',
      tips: Array.isArray(e.tips) ? e.tips : [],
      display_text: e.display_text,
      correct_text: e.correct_text,
      cards: null,
      explanation: e.explanation || '',
      source_file: path.basename(filePath),
      source_page: Number(e.source_page) || null,
      quality_ok: e.quality_ok !== false,
      reviewed: e.quality_ok !== false, // unsichere Fälle erst nach menschlicher Kontrolle live
    }));
}

async function main() {
  const { folder, grade } = parseArgs(process.argv);
  if (!anthropic) {
    console.error('ANTHROPIC_API_KEY fehlt (.env prüfen).');
    process.exit(1);
  }
  if (!isDbEnabled) {
    console.error('Supabase nicht konfiguriert (.env prüfen) – ohne DB kann nichts gespeichert werden.');
    process.exit(1);
  }
  const files = fs.readdirSync(folder)
    .filter((f) => /\.(pdf|png|jpe?g|webp)$/i.test(f))
    .map((f) => path.join(folder, f));
  if (!files.length) {
    console.error(`Keine PDF/Bild-Dateien in ${folder} gefunden.`);
    process.exit(1);
  }

  console.log(`${files.length} Datei(en) gefunden. Modell: ${MODEL}\n`);

  let total = 0;
  let flagged = 0;
  const tagCounts = {};

  for (const file of files) {
    process.stdout.write(`→ ${path.basename(file)} ... `);
    try {
      const rows = await extractFromFile(file, grade);
      if (!rows.length) {
        console.log('keine Übungen erkannt.');
        continue;
      }
      const { error } = await supabase.from('exercise_bank').insert(rows);
      if (error) {
        console.log(`FEHLER beim Speichern: ${error.message}`);
        continue;
      }
      total += rows.length;
      for (const r of rows) {
        if (!r.quality_ok) flagged++;
        for (const t of r.feature_tags) tagCounts[t] = (tagCounts[t] || 0) + 1;
      }
      console.log(`${rows.length} Übung(en) gespeichert.`);
    } catch (err) {
      console.log(`FEHLER: ${err.message}`);
    }
  }

  console.log('\n─── Zusammenfassung ───────────────────────');
  console.log(`Gespeichert:        ${total}`);
  console.log(`Zur Kontrolle (nicht live, reviewed=false): ${flagged}`);
  console.log('Kategorien:');
  Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).forEach(([tag, n]) => console.log(`  ${tag}: ${n}`));
  if (flagged) {
    console.log(
      `\n${flagged} Übung(en) warten auf Kontrolle: ` +
      `SELECT * FROM exercise_bank WHERE reviewed = false; ` +
      `nach Prüfung: UPDATE exercise_bank SET reviewed = true WHERE id = '...';`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
