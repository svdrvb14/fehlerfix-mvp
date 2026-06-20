/**
 * FehlerFix – Server
 *
 * Architektur (inspiriert von aitest4.html):
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │  CUSTOM MEMORY (pro Session, in-memory)                         │
 *   │  featureTable = [ { name, mastery, right, wrong }, … ]          │
 *   │                                                                 │
 *   │  Adaptiver Algorithmus:                                         │
 *   │    practice_weight = max(1, 100 - mastery)                      │
 *   │    → niedrigere Mastery ⇒ häufiger geübt                        │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 *   /api/analyze           – Handschrift → initiale Feature-Table
 *   /api/next-exercise     – gewichtete Features → adaptive Übung
 *                            (jedes Item kennt "sein" Feature)
 *   /api/submit-exercise   – Antworten → KI-Grading per Feature
 *                            + Erkennung NEUER Features
 *                            + Memory-Update (mastery, right, wrong)
 *
 *   KI: OpenAI GPT-5 via Chat Completions API
 */

// override:true → .env-Datei gewinnt immer, auch wenn die Shell bereits
// eine (z.B. leere) OPENAI_API_KEY-Variable gesetzt hat.
require('dotenv').config({ override: true });

const express = require('express');
const path = require('path');
const OpenAI = require('openai').default || require('openai');

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = 'gpt-5';

if (!process.env.OPENAI_API_KEY) {
  console.error('\n[FehlerFix] ⚠️  OPENAI_API_KEY ist nicht gesetzt!');
  console.error('[FehlerFix] Lege eine .env-Datei an (siehe .env.example) und trage deinen Key ein.');
  console.error('[FehlerFix] Server startet trotzdem – Endpoints liefern dann Fehler bis Key gesetzt ist.\n');
}

// Lazy-Init: kein Crash beim Start, falls Key fehlt – stattdessen klare Fehlermeldung bei Requests
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

app.use(express.json({ limit: '30mb' }));

// Request-Logging
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    const len = req.headers['content-length'] || '?';
    const ts = new Date().toISOString().slice(11, 19);
    console.log(`[${ts}] → ${req.method} ${req.path}  (body: ${len} bytes)`);
    const started = Date.now();
    res.on('finish', () => {
      console.log(
        `[${new Date().toISOString().slice(11, 19)}] ← ${req.method} ${req.path}  ${res.statusCode}  ${Date.now() - started}ms`
      );
    });
  }
  next();
});

// Health-Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    apiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
    model: MODEL,
    time: new Date().toISOString(),
  });
});

app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────────────────────
// SESSION-STATE / CUSTOM MEMORY
// ─────────────────────────────────────────────────────────────
const sessions = {};

function getSession(sessionId) {
  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      // Schüler-Profil (für altersgerechte Themen, Komplexität, Bewertung)
      profile: null, // { grade, schoolType }

      // Custom Memory – wächst über die Zeit
      featureTable: [],

      // Für adaptive Generierung
      lastExercise: null,
      lastExercisePerformance: null,
      lastFocusFeature: null,
      exerciseHistory: [],

      // Gamification (UI)
      level: 1,
      points: 0,
      exercisesCompleted: 0,
    };
  }
  return sessions[sessionId];
}

/**
 * Übersetzt Klassenstufe/Schulform in eine Beschreibung für die KI.
 * Wird in alle relevanten Prompts eingebaut.
 */
function profileToPromptBlock(profile) {
  if (!profile || !profile.grade) {
    return 'SCHÜLER-PROFIL: nicht angegeben – nimm mittleres Sekundarstufe-I-Niveau (Klasse 6-8) an.\n';
  }
  const grade = profile.grade;
  const school = profile.schoolType || 'unbekannt';
  let stage;
  if (grade <= 4) stage = 'Grundschule (Primärstufe)';
  else if (grade <= 10) stage = 'Sekundarstufe I';
  else stage = 'Sekundarstufe II (Oberstufe, Richtung Abitur)';

  return (
    'SCHÜLER-PROFIL:\n' +
    `- Klassenstufe: ${grade}\n` +
    `- Schulform: ${school}\n` +
    `- Bildungsstufe: ${stage}\n` +
    '- Passe Themen, Wortschatz, Satzkomplexität und Schwierigkeit der Übungen ' +
    'an dieses Niveau an. Keine kindlichen Themen für ältere Schüler (z.B. keine ' +
    '„Wenn ich Superkräfte hätte"-Aufgaben für eine 12. Klasse). Bei jüngeren Klassen ' +
    'einfache Sätze, geläufiger Wortschatz.\n'
  );
}

// Debug: Liste aller aktiven Sessions mit Kurz-Zusammenfassung
app.get('/api/debug/sessions', (req, res) => {
  const list = Object.entries(sessions).map(([id, s]) => ({
    sessionId: id,
    exercisesCompleted: s.exercisesCompleted,
    level: s.level,
    points: s.points,
    featuresCount: s.featureTable.length,
    lastFocus: s.lastFocusFeature,
    inspectUrl: `/api/debug/state/${id}`,
  }));
  res.json({ count: list.length, sessions: list });
});

app.get('/api/debug/state/:sid', (req, res) => {
  const s = sessions[req.params.sid];
  if (!s) return res.status(404).json({ error: 'Session unbekannt.' });
  res.json({
    featureTable: s.featureTable,
    history: s.exerciseHistory,
    lastFocus: s.lastFocusFeature,
    lastPerf: s.lastExercisePerformance,
    level: s.level,
    points: s.points,
    exercisesCompleted: s.exercisesCompleted,
  });
});

// ─────────────────────────────────────────────────────────────
// ALGORITHMUS-HELPER (Kern aus aitest4.html)
// ─────────────────────────────────────────────────────────────
function clamp(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function norm(s) {
  return String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function weightedFeatures(table) {
  return table.map((f) => ({
    name: f.name,
    mastery_percent: f.mastery,
    right_count: f.right || 0,
    wrong_count: f.wrong || 0,
    practice_weight: Math.max(1, 100 - (Number(f.mastery) || 0)),
  }));
}

function similarFeatureExists(table, name) {
  const n = norm(name);
  if (!n) return true;
  return table.some((f) => {
    const fn = norm(f.name);
    return fn === n || fn.includes(n) || n.includes(fn);
  });
}

function addNewFeatures(table, newFeatures) {
  const added = [];
  for (const nf of newFeatures || []) {
    const name = String(nf.name || '').trim();
    if (!name) continue;
    if (similarFeatureExists(table, name)) {
      console.log(`[memory] Neues Feature übersprungen (Duplikat): "${name}"`);
      continue;
    }
    const wrongCount = clamp(nf.wrong || nf.count || 1, 1, 99);
    const initialMastery = clamp(
      nf.initial_mastery != null ? nf.initial_mastery : wrongCount >= 2 ? 30 : 40,
      0,
      100
    );
    const feat = { name, mastery: initialMastery, right: 0, wrong: wrongCount };
    table.push(feat);
    added.push({ ...feat, reason: nf.reason || '', evidence: nf.evidence || '' });
  }
  return added;
}

function applyGradingResults(table, results) {
  for (const r of results || []) {
    if (!r || !r.feature) continue;
    const targetName = norm(r.feature);
    let match = table.find((f) => norm(f.name) === targetName);
    if (!match) {
      const firstWord = targetName.split(' ')[0];
      match = table.find(
        (f) =>
          norm(f.name).includes(firstWord) ||
          targetName.includes(norm(f.name).split(' ')[0])
      );
    }
    if (match) {
      match.right = (match.right || 0) + clamp(r.right, 0, 99);
      match.wrong = (match.wrong || 0) + clamp(r.wrong, 0, 99);
      if (r.new_mastery != null && Number.isFinite(Number(r.new_mastery))) {
        match.mastery = clamp(r.new_mastery, 0, 100);
      }
    }
  }
}

function parseJsonResponse(rawText) {
  let cleaned = (rawText || '').trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

/**
 * OpenAI Chat Completions: Bild im image_url-Format.
 */
function toImageBlock(dataUrl) {
  return {
    type: 'image_url',
    image_url: { url: dataUrl },
  };
}

/**
 * Wrapper für OpenAI-Calls. Liefert den Antwort-String und loggt Dauer.
 * Erwartet Messages im OpenAI-Format (text/image_url-Blöcke).
 */
async function callOpenAI({ label, systemPrompt, userContent, maxTokens = 8000 }) {
  if (!openai) {
    const e = new Error('OPENAI_API_KEY ist nicht gesetzt – bitte in .env eintragen und Server neu starten.');
    e.status = 500;
    throw e;
  }
  const started = Date.now();
  try {
    // GPT-5 ist ein Reasoning-Modell: verbraucht intern viele "denk"-Tokens.
    // - reasoning_effort 'low' = weniger interne Verarbeitung, mehr Budget für Output
    // - max_completion_tokens bewusst hoch, damit Reasoning + Output reinpassen
    const response = await openai.chat.completions.create({
      model: MODEL,
      response_format: { type: 'json_object' },
      max_completion_tokens: maxTokens,
      reasoning_effort: 'low',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    });
    const elapsed = Date.now() - started;
    const choice = response.choices?.[0];
    const text = choice?.message?.content || '';
    const finishReason = choice?.finish_reason;
    const usage = response.usage;

    console.log(
      `[${label}] OpenAI-Antwort nach ${elapsed}ms (${text.length} chars, finish=${finishReason}, ` +
        `tokens: in=${usage?.prompt_tokens}, out=${usage?.completion_tokens}, ` +
        `reasoning=${usage?.completion_tokens_details?.reasoning_tokens ?? '?'})`
    );

    // Wenn leer: detailliert loggen, was zurückkam
    if (!text) {
      console.error(`[${label}] LEERE Antwort! finish_reason=${finishReason}`);
      console.error(`[${label}] message-Objekt:`, JSON.stringify(choice?.message)?.slice(0, 500));
      if (finishReason === 'length') {
        console.error(`[${label}] → Token-Budget reicht nicht. Erhöhe maxTokens oder senke reasoning_effort.`);
      }
    }
    return { text, elapsed, finishReason, raw: response };
  } catch (err) {
    const elapsed = Date.now() - started;
    console.error(`[${label}] OpenAI-Fehler nach ${elapsed}ms:`, err.message || err);
    if (err.status) console.error(`[${label}] Status:`, err.status);
    if (err.response?.data) console.error(`[${label}] Detail:`, JSON.stringify(err.response.data).slice(0, 500));
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// ROUTE 1: /api/analyze – Handschrift → initiale Feature-Table
// ─────────────────────────────────────────────────────────────
app.post('/api/analyze', async (req, res) => {
  const { sessionId, images, profile } = req.body || {};
  if (!sessionId || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: 'sessionId und images sind erforderlich.' });
  }

  const session = getSession(sessionId);
  if (profile && typeof profile === 'object') {
    session.profile = {
      grade: Number(profile.grade) || null,
      schoolType: String(profile.schoolType || '').slice(0, 60),
    };
  }
  const sizesKb = images.map((d) => Math.round((d.length * 0.75) / 1024));
  console.log(`[analyze] Session: ${sessionId}`);
  console.log(`[analyze] Profil: ${JSON.stringify(session.profile)}`);
  console.log(`[analyze] Bilder empfangen: ${sizesKb.join('kb, ')}kb. Schicke an GPT-5...`);

  const userContent = [
    {
      type: 'text',
      text:
        profileToPromptBlock(session.profile) + '\n' +
        'Auf den Bildern siehst du drei handgeschriebene Texte einer Schülerin / eines Schülers.\n' +
        'Lies die Handschrift sorgfältig. Identifiziere ALLE Rechtschreib-/Grammatik-Fehler ' +
        'und ordne sie spezifischen, trainierbaren KATEGORIEN (Features) zu.\n\n' +
        'Beispiele für Feature-Namen: "ie/i-Schreibung", "ss/ß", "Groß-/Kleinschreibung von Nomen", ' +
        '"Doppelkonsonanten", "Dehnungs-h", "das/dass", "Kommasetzung bei Aufzählungen", ' +
        '"Zusammen-/Getrenntschreibung", "seid/seit", "wider/wieder", "Endung -ig/-lich".\n\n' +
        'Antworte AUSSCHLIESSLICH mit JSON in genau diesem Format:\n' +
        '{\n' +
        '  "featureTable": [\n' +
        '    {\n' +
        '      "name": "ie/i-Schreibung",\n' +
        '      "wrong": 4,                    // wie oft kam dieser Fehler vor\n' +
        '      "initialMastery": 25,          // 0-100: niedriger = mehr Übungsbedarf\n' +
        '      "examples": ["Tier→Tir", "Bieber→Biber"]\n' +
        '    }\n' +
        '  ],\n' +
        '  "totalErrors": 6,\n' +
        '  "readSuccessfully": true\n' +
        '}\n\n' +
        'Regeln für initialMastery:\n' +
        '- 4+ Fehler in der Kategorie → mastery 15-25\n' +
        '- 2-3 Fehler → mastery 25-40\n' +
        '- 1 Fehler → mastery 40-55\n' +
        '- kein Fehler aber typisch für Klassenstufe → mastery 70-85\n\n' +
        'Sortiere die featureTable nach Übungsbedarf (niedrigste mastery zuerst). ' +
        'Wenn das Kind quasi keine Fehler macht, gib trotzdem 2-3 für die Klassenstufe ' +
        'typische Kategorien zurück (mastery 70-85).',
    },
    ...images.map(toImageBlock),
  ];

  try {
    const { text } = await callOpenAI({
      label: 'analyze',
      systemPrompt:
        'Du bist eine erfahrene Deutschlehrkraft für alle Klassenstufen (1-13). ' +
        'Du analysierst Handschrift-Bilder und baust ein strukturiertes Fehlerprofil. ' +
        'Du passt deine Erwartungen an die angegebene Klassenstufe an. ' +
        'Du antwortest IMMER ausschließlich mit gültigem JSON.',
      userContent,
      maxTokens: 12000,
    });

    let parsed;
    try {
      parsed = parseJsonResponse(text);
    } catch (e) {
      console.error('[analyze] JSON-Parse-Fehler. Roh-Antwort:\n' + text);
      return res.status(502).json({
        error: 'KI-Antwort konnte nicht verarbeitet werden.',
        debug: { rawPreview: text.slice(0, 300) },
      });
    }

    const rawTable = Array.isArray(parsed.featureTable) ? parsed.featureTable : [];
    const table = rawTable
      .map((f) => ({
        name: String(f.name || '').trim(),
        mastery: clamp(f.initialMastery != null ? f.initialMastery : f.mastery, 0, 100),
        right: 0,
        wrong: clamp(f.wrong || 1, 1, 99),
      }))
      .filter((f) => f.name);

    if (table.length === 0) {
      console.warn('[analyze] Leere Feature-Table von KI – setze Defaults.');
      table.push(
        { name: 'Groß-/Kleinschreibung', mastery: 60, right: 0, wrong: 2 },
        { name: 'das/dass', mastery: 65, right: 0, wrong: 1 },
        { name: 'Kommasetzung', mastery: 55, right: 0, wrong: 2 }
      );
    }

    table.sort((a, b) => a.mastery - b.mastery);

    session.featureTable = table;
    session.lastFocusFeature = table[0] ? table[0].name : null;

    console.log(
      `[analyze] Memory initialisiert: ${table.length} Features. Top: ${table
        .slice(0, 3)
        .map((f) => `${f.name}(${f.mastery}%)`)
        .join(', ')}`
    );

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({
      error: 'Analyse fehlgeschlagen: ' + (err.message || 'unbekannter Fehler'),
    });
  }
});

// ─────────────────────────────────────────────────────────────
// ROUTE 2: /api/next-exercise – adaptive Übungsgenerierung
// ─────────────────────────────────────────────────────────────
app.post('/api/next-exercise', async (req, res) => {
  const { sessionId } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'sessionId erforderlich.' });

  const session = getSession(sessionId);
  if (!session.featureTable || session.featureTable.length === 0) {
    return res.status(400).json({ error: 'Noch keine Analyse vorhanden.' });
  }

  const weighted = weightedFeatures(session.featureTable);
  weighted.sort((a, b) => b.practice_weight - a.practice_weight);

  // ── ADAPTIVE FEATURE-WAHL: EIN Feature pro Übung ─────
  // Höchste practice_weight = höchster Übungsbedarf.
  // Wahl-Logik: bei "poor" beim alten Feature bleiben, sonst Top-Feature.
  let focusFeature;
  if (session.lastExercisePerformance === 'poor' && session.lastFocusFeature) {
    focusFeature = session.lastFocusFeature;
  } else {
    focusFeature = weighted[0]?.name;
  }
  const focusEntry = weighted.find((f) => f.name === focusFeature) || weighted[0];

  // ── ÜBUNGSTYP-WAHL: Round-Robin über die 3 Typen ────
  // Damit alle Typen garantiert vorkommen (sonst wählt die KI fast nie Diktat).
  const EXERCISE_TYPES = ['cloze_text', 'error_text', 'audio_dictation'];
  const exType = EXERCISE_TYPES[session.exercisesCompleted % EXERCISE_TYPES.length];

  const typeDescriptions = {
    cloze_text:
      'LÜCKENTEXT: Erstelle einen zusammenhängenden kurzen Text (3-5 Sätze) mit Lücken "___" ' +
      'genau an den Stellen, wo das Fokus-Feature greift. Die Schülerin/der Schüler schreibt ' +
      'den Text handschriftlich ab und füllt dabei die Lücken. ' +
      'Lücken sind nur "___" (drei Unterstriche). Reihenfolge der ___ = Reihenfolge der Feature-Vorkommen. ' +
      'Lücken betreffen NUR den Feature-Teil eines Wortes (z.B. "T___ger" statt komplettem "___"). ' +
      'instruction: "Schreibe den Text ab und fülle die Lücken."',
    error_text:
      'FEHLERTEXT: Erstelle einen zusammenhängenden kurzen Text (3-5 Sätze) mit 2-4 eingebauten ' +
      'Rechtschreibfehlern – ALLE zum Fokus-Feature. Alle anderen Wörter sind korrekt. ' +
      'Die Schülerin/der Schüler schreibt den Text in der KORREKTEN Form handschriftlich ab. ' +
      'instruction: "In diesem Text sind ein paar Fehler. Schreibe ihn richtig ab."',
    audio_dictation:
      'AUDIO-DIKTAT: Erstelle einen zusammenhängenden, kurzen, KORREKT geschriebenen Text (3-5 Sätze). ' +
      'Der Text wird per Sprachausgabe LANGSAM VORGELESEN – die Schülerin/der Schüler hört zu und ' +
      'schreibt mit. Der Text enthält 2-4 Vorkommen des Fokus-Features (klar hörbar, aber rechtschreiblich ' +
      'eine Herausforderung). KEINE Lücken, KEINE Fehler. ' +
      'WICHTIG: Setze displayText auf einen leeren String "" – der Text wird nicht angezeigt, nur vorgelesen. ' +
      'Achte darauf, dass der Text gut sprechbar ist (keine komplizierten Abkürzungen, Zahlen etc.). ' +
      'instruction: "Hör gut zu und schreibe auf, was du hörst."',
  };

  const prompt =
    'Du erstellst EINE handschriftliche Rechtschreibübung für eine Schülerin / einen Schüler.\n\n' +
    profileToPromptBlock(session.profile) + '\n' +
    'WICHTIG: Die App ist eine MOTORISCH FÖRDERNDE Lern-App. Die Aufgabe wird HANDSCHRIFTLICH ' +
    'auf einem digitalen Notizbuch abgeschrieben. Es gibt KEINE Multiple-Choice, KEINE Tastatur.\n\n' +
    'FEATURE-TABLE des Lerners (Memory):\n' +
    JSON.stringify(weighted, null, 2) +
    '\n\n' +
    `Bisher abgeschlossene Übungen: ${session.exercisesCompleted}\n` +
    `Letzter Fokus: ${session.lastFocusFeature || '-'}\n` +
    `Performance der letzten Übung: ${session.lastExercisePerformance || 'keine'}\n` +
    `History (letzte 5): ${JSON.stringify(session.exerciseHistory.slice(-5))}\n\n` +
    `FOKUS-FEATURE FÜR DIESE ÜBUNG: "${focusFeature}" (mastery: ${focusEntry?.mastery_percent}%, weight: ${focusEntry?.practice_weight})\n\n` +
    'REGELN:\n' +
    '- Diese Übung trainiert AUSSCHLIESSLICH das Fokus-Feature. KEINE Mischung mit anderen Features.\n' +
    '- Bei letzter Performance "good"  → mach die Übung etwas SCHWERER (längere/seltenere Wörter).\n' +
    '- Bei letzter Performance "poor"  → mach sie EINFACHER (kürzere/häufigere Wörter).\n' +
    '- Bei "medium" oder keiner Historie → mittleres Niveau.\n\n' +
    `ÜBUNGSTYP FÜR DIESE ÜBUNG (fest vorgegeben): "${exType}"\n\n` +
    typeDescriptions[exType] + '\n\n' +
    'KRITISCHE REGELN:\n' +
    '- Die Aufgabenstellung (instruction) darf NIEMALS die Lösung verraten. ' +
    'Erwähne NIE konkrete Wörter, um die es geht. Schlechtes Beispiel: "Wie schreibt man Zoo-Tier?".\n' +
    '- Der Text ist eine kleine Geschichte oder Beobachtung, 3-5 Sätze, altersgerecht, abwechslungsreich.\n' +
    '- Genau der oben genannte Übungstyp – KEIN anderer.\n\n' +
    'ANTWORT AUSSCHLIESSLICH ALS JSON:\n' +
    '{\n' +
    `  "type": "${exType}",\n` +
    '  "focusFeature": "<exakter Name aus Feature-Table>",\n' +
    '  "instruction": "<altersgerechte Aufgabenstellung OHNE Antworten zu verraten>",\n' +
    '  "displayText": "<der Text, der angezeigt wird – Lücken bei cloze_text, Fehler bei error_text, LEER bei audio_dictation>",\n' +
    '  "correctText": "<die vollständig korrekte Lösung, die geschrieben werden sollte – bei audio_dictation: der vorzulesende Text>",\n' +
    '  "explanation": "<1-2 Sätze, erklärt die Regel/das WARUM des Features – wird NACH der Bewertung gezeigt>"\n' +
    '}';

  console.log(
    `[next-exercise] Typ: ${exType}, Fokus: "${focusFeature}" (Gewicht ${focusEntry?.practice_weight}), ` +
      `Performance: ${session.lastExercisePerformance || '-'}, Übung #${session.exercisesCompleted + 1}`
  );

  try {
    const { text } = await callOpenAI({
      label: 'next-exercise',
      systemPrompt:
        'Du bist ein adaptiver Deutsch-Tutor für alle Klassenstufen (1-13). ' +
        'Du erstellst gezielte Rechtschreibübungen mit altersgerechten Erklärungen. ' +
        'Du antwortest IMMER ausschließlich mit gültigem JSON.',
      userContent: prompt,
      maxTokens: 8000,
    });

    let exercise;
    try {
      exercise = parseJsonResponse(text);
    } catch (e) {
      console.error('[next-exercise] JSON-Parse-Fehler. Roh-Antwort:\n' + text);
      return res.status(502).json({ error: 'KI-Antwort konnte nicht verarbeitet werden.' });
    }

    // Den vorgegebenen Typ erzwingen, falls die KI einen anderen schickt
    if (exercise.type !== exType) {
      console.warn(`[next-exercise] KI lieferte Typ "${exercise.type}", erzwinge "${exType}".`);
      exercise.type = exType;
    }
    // Bei audio_dictation: displayText immer leer halten (sonst sieht das Kind den Text)
    if (exType === 'audio_dictation') {
      exercise.displayText = '';
    }

    const focus = exercise.focusFeature || exercise.focusCategory;
    if (focus) session.lastFocusFeature = focus;
    session.lastExercise = exercise;

    console.log(
      `[next-exercise] OK – Typ: ${exercise.type}, Fokus: "${focus}", ` +
        `Text-Länge: ${(exercise.correctText || '').length} chars`
    );
    return res.json(exercise);
  } catch (err) {
    return res.status(500).json({
      error: 'Übung konnte nicht erstellt werden: ' + (err.message || 'unbekannter Fehler'),
    });
  }
});

// ─────────────────────────────────────────────────────────────
// ROUTE 3: /api/submit-exercise
//   Vision-basiertes Grading: KI liest die handschriftliche Antwort,
//   vergleicht sie mit der erwarteten Lösung, gradet Features
//   und erkennt neue Fehlermuster.
// ─────────────────────────────────────────────────────────────
app.post('/api/submit-exercise', async (req, res) => {
  const { sessionId, image } = req.body || {};
  if (!sessionId || !image) {
    return res.status(400).json({ error: 'sessionId und image erforderlich.' });
  }

  const session = getSession(sessionId);
  const last = session.lastExercise;
  if (!last || !last.correctText) {
    return res.status(400).json({ error: 'Keine aktive Übung gefunden.' });
  }

  const sizeKb = Math.round((image.length * 0.75) / 1024);
  console.log(`[submit] Session: ${sessionId}, Bild: ${sizeKb}kb, Fokus: "${session.lastFocusFeature}"`);

  // Vision-Prompt: KI liest die Schrift, vergleicht, bewertet, erkennt neue Features
  const gradeText =
    profileToPromptBlock(session.profile) + '\n' +
    'Auf dem Bild siehst du den handgeschriebenen Text einer Schülerin / eines Schülers.\n\n' +
    'KONTEXT DER ÜBUNG:\n' +
    `- Übungstyp: ${last.type}\n` +
    `- Fokus-Feature: ${last.focusFeature || session.lastFocusFeature}\n` +
    `- Angezeigter Text (Aufgabe): "${last.displayText}"\n` +
    `- Erwartete korrekte Lösung: "${last.correctText}"\n\n` +
    'BEKANNTE FEATURES (Memory):\n' +
    JSON.stringify(session.featureTable, null, 2) +
    '\n\n' +
    'AUFGABE:\n' +
    '1) Lies die Handschrift sorgfältig (bestes Bemühen, auch wenn unsauber).\n' +
    '2) Vergleiche mit der erwarteten Lösung.\n' +
    '3) Bewerte das FOKUS-Feature: wie oft korrekt/falsch. Schlage neue mastery (0-100) vor.\n' +
    '4) Bewerte ANDERE bekannte Features, falls beobachtbar.\n' +
    '5) Erkenne NEUE Fehlermuster (spezifisch, trainierbar, keine vagen Stil-Probleme).\n' +
    '6) Liste JEDES FALSCH GESCHRIEBENE WORT einzeln als word_corrections (siehe unten).\n' +
    '7) Gib einen overall_score 0-100 für diese Übung.\n\n' +
    'WICHTIG word_corrections: Jedes Wort, das die Schülerin/der Schüler falsch geschrieben hat, ' +
    'kommt als eigener Eintrag in die Liste – mit der korrekten Schreibweise und einer kindgerechten, ' +
    'altersangemessenen Erklärung (1-2 Sätze, das WARUM, keine Trockenheit). KEINE Sammelfeedbacks. ' +
    'Wenn alles richtig war: leere Liste.\n\n' +
    'WICHTIG mastery: Bei hoher Korrektheit (alles richtig) +15-25 Punkte, bei vielen Fehlern -15-25 Punkte. ' +
    'Bei teilweisem Erfolg moderat.\n\n' +
    'ANTWORT AUSSCHLIESSLICH ALS JSON:\n' +
    '{\n' +
    '  "overall_score": 0-100,\n' +
    '  "read_text": "<was du in der Handschrift gelesen hast>",\n' +
    '  "summary_good": ["kurze, motivierende Sätze, was gut war"],\n' +
    '  "word_corrections": [\n' +
    '    { "wrong": "<falsch geschriebenes Wort>", "correct": "<richtige Schreibweise>", ' +
    '"explanation": "<altersgerechte 1-2-Satz-Erklärung, warum so>", "feature": "<Feature-Name>" }\n' +
    '  ],\n' +
    '  "results": [\n' +
    '    { "feature":"<exakter Name aus Memory>", "right":N, "wrong":N, "feedback":"...", "new_mastery":0-100 }\n' +
    '  ],\n' +
    '  "new_features_detected": [\n' +
    '    { "name":"...", "reason":"...", "evidence":"...", "wrong":N, "initial_mastery":0-100 }\n' +
    '  ]\n' +
    '}';

  const userContent = [
    { type: 'text', text: gradeText },
    toImageBlock(image),
  ];

  let aiGrading = null;
  try {
    const { text } = await callOpenAI({
      label: 'submit',
      systemPrompt:
        'Du bist ein strenger, aber kindgerechter deutscher Rechtschreiblehrer. ' +
        'Du liest Kinderhandschrift, bewertest präzise nach Feature und erkennst neue Fehlermuster. ' +
        'Du antwortest IMMER ausschließlich mit gültigem JSON.',
      userContent,
      maxTokens: 8000,
    });
    try {
      aiGrading = parseJsonResponse(text);
    } catch (e) {
      console.error('[submit] JSON-Parse-Fehler. Roh-Antwort:\n' + text);
      aiGrading = null;
    }
  } catch (err) {
    aiGrading = null;
  }

  // ─── Memory-Update + Score ─────────────────────────
  let addedFeatures = [];
  let ratio = 0.5; // Fallback, falls KI versagt

  if (aiGrading) {
    applyGradingResults(session.featureTable, aiGrading.results);
    addedFeatures = addNewFeatures(session.featureTable, aiGrading.new_features_detected);
    session.featureTable.sort((a, b) => a.mastery - b.mastery);

    const score = clamp(aiGrading.overall_score, 0, 100);
    ratio = score / 100;

    console.log(
      `[submit] Score: ${score}, gelesen: "${(aiGrading.read_text || '').slice(0, 80)}", ` +
        `Features gegradet: ${aiGrading.results?.length || 0}, neue: ${addedFeatures.length}`
    );
    if (addedFeatures.length) {
      console.log('[submit] NEU:', addedFeatures.map((f) => `${f.name} (m=${f.mastery})`).join(', '));
    }
  } else {
    console.warn('[submit] KI-Grading fehlte – nutze Default-Score 50%.');
  }

  // ─── Gamification ──────────────────────────────────
  const points = Math.round(ratio * 10);
  session.points += points;
  session.exercisesCompleted += 1;
  session.level = Math.floor(session.points / 100) + 1;
  session.lastExercisePerformance = ratio >= 0.8 ? 'good' : ratio >= 0.5 ? 'medium' : 'poor';
  session.exerciseHistory.push({
    feature: session.lastFocusFeature,
    score: Math.round(ratio * 100),
  });

  const pointsToNextLevel = session.level * 100 - session.points;
  const levelProgressPercent = ((session.points % 100) / 100) * 100;

  return res.json({
    points,
    totalPoints: session.points,
    level: session.level,
    pointsToNextLevel,
    levelProgressPercent,
    exercisesCompleted: session.exercisesCompleted,
    summary_good: aiGrading?.summary_good || [],
    word_corrections: Array.isArray(aiGrading?.word_corrections) ? aiGrading.word_corrections : [],
    explanation: last.explanation || '',
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n[FehlerFix] ✏️  Server läuft auf http://localhost:${PORT}`);
  console.log(`[FehlerFix] Modell: ${MODEL} (OpenAI)`);
  console.log(`[FehlerFix] Architektur: Feature-Table-Memory + adaptive Gewichtung\n`);
});
