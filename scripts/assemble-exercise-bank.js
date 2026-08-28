/**
 * Dritter Schritt der Agent-Pipeline (siehe .claude/agents/): sammelt alle
 * Ergebnisse von fehlerfix-page-screener (*.structures.json) und
 * fehlerfix-exercise-writer (*.exercise-*.json) aus material/_work/,
 * schreibt die fertigen Übungen in exercise_bank und erzeugt ein lesbares
 * Konzept-Dokument (Klassenstufe × Format × Fehlerkategorie).
 *
 * Bewusst ein Skript statt Agent-improvisierter DB-Zugriff: zuverlässig,
 * wiederholbar, das Gleiche jedes Mal.
 *
 * Nutzung:
 *   node scripts/assemble-exercise-bank.js [--dir material/_work]
 */
require('dotenv').config({ override: true });
const fs = require('fs');
const path = require('path');
const { supabase, isDbEnabled } = require('../lib/db');

function parseArgs(argv) {
  let dir = 'material/_work';
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--dir') dir = argv[++i];
  }
  return { dir };
}

function readJsonFiles(dir, suffix) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(suffix))
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      } catch (e) {
        console.warn(`  Konnte ${f} nicht lesen: ${e.message}`);
        return null;
      }
    })
    .filter(Boolean);
}

function buildConceptDoc(structureFiles, exerciseRows) {
  // Matrix: Klassenstufe → Format → Anzahl
  const matrix = {};
  for (const row of exerciseRows) {
    const g = row.grade || 'unbekannt';
    matrix[g] = matrix[g] || {};
    matrix[g][row.format] = (matrix[g][row.format] || 0) + 1;
  }

  const allSpecs = structureFiles.flatMap((f) => f.specs || []);
  const flagged = exerciseRows.filter((r) => r.quality_ok === false);

  let md = '# FehlerFix-Übungsreihe – Konzept-Übersicht\n\n';
  md += `Erzeugt am ${new Date().toISOString().slice(0, 10)}. `;
  md += `${allSpecs.length} Strukturen erkannt, ${exerciseRows.length} Übungen geschrieben, `;
  md += `${flagged.length} davon zur Kontrolle markiert.\n\n`;

  md += '## Abdeckung nach Klassenstufe und Format\n\n';
  const grades = Object.keys(matrix).sort();
  const formats = [...new Set(exerciseRows.map((r) => r.format))].sort();
  md += '| Klasse | ' + formats.join(' | ') + ' | Gesamt |\n';
  md += '|---|' + formats.map(() => '---').join('|') + '|---|\n';
  for (const g of grades) {
    const counts = formats.map((f) => matrix[g][f] || 0);
    const total = counts.reduce((a, b) => a + b, 0);
    md += `| ${g} | ` + counts.join(' | ') + ` | ${total} |\n`;
  }

  md += '\n## Themenfelder\n\n';
  const topics = {};
  for (const r of exerciseRows) {
    const t = r.topic || 'unbekannt';
    topics[t] = (topics[t] || 0) + 1;
  }
  Object.entries(topics).sort((a, b) => b[1] - a[1]).forEach(([t, n]) => {
    md += `- ${t}: ${n}\n`;
  });

  if (flagged.length) {
    md += '\n## Zur Kontrolle (reviewed=false, noch nicht live)\n\n';
    for (const r of flagged) {
      md += `- **${r.topic || r.format}** (${r.source_file}, Seite ${r.source_page || '?'}): ${r.quality_reason || 'kein Grund angegeben'}\n`;
    }
  }

  return md;
}

async function main() {
  const { dir } = parseArgs(process.argv);
  if (!isDbEnabled) { console.error('Supabase nicht konfiguriert (.env prüfen).'); process.exit(1); }

  const structureFiles = readJsonFiles(dir, '.structures.json');
  const exerciseFiles = readJsonFiles(dir, '.json').filter((f) => f.format && f.correct_text);

  console.log(`Gefunden: ${structureFiles.length} Struktur-Datei(en), ${exerciseFiles.length} fertige Übung(en).`);
  if (!exerciseFiles.length) { console.log('Nichts zu speichern.'); return; }

  const rows = exerciseFiles.map((ex) => ({
    grade: ex.grade || null,
    format: ex.format,
    feature_tags: ex.feature_tags || [],
    topic: ex.topic || null,
    instruction: ex.instruction || '',
    tips: ex.tips || [],
    display_text: ex.display_text || '',
    correct_text: ex.correct_text,
    cards: ex.cards || null,
    explanation: ex.explanation || '',
    source_file: ex.source_file || null,
    source_page: ex.source_page || null,
    quality_ok: ex.quality_ok !== false,
    reviewed: ex.quality_ok !== false,
    generation_method: ex.generation_method || 'inspired',
    structure_source: ex.structure_source || null,
  }));

  const { error } = await supabase.from('exercise_bank').insert(rows);
  if (error) { console.error('FEHLER beim Speichern:', error.message); process.exit(1); }
  console.log(`${rows.length} Übung(en) in exercise_bank gespeichert.`);

  const doc = buildConceptDoc(structureFiles, rows);
  const outPath = path.join(dir, '..', 'UEBUNGSREIHE-KONZEPT.md');
  fs.writeFileSync(outPath, doc);
  console.log(`Konzept-Dokument geschrieben: ${outPath}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
