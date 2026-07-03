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
 *   KI: Anthropic Claude (Sonnet/Opus) via Messages API mit Vision
 */

// override:true → .env-Datei gewinnt immer, auch wenn die Shell bereits
// eine (z.B. leere) ANTHROPIC_API_KEY-Variable gesetzt hat.
require('dotenv').config({ override: true });

const express = require('express');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');

// Modulare Erweiterungs-Architektur:
//   - Sprach-Module (mehrsprachig vorbereitet, aktuell nur Deutsch aktiv)
//   - Curriculum-Slot (echte Daten: Hessen; weitere Bundesländer kommen via Partner)
//   - Lernmethoden (aktuell: FRESCH für Deutsch)
const { getLanguage, DEFAULT_LANGUAGE } = require('./lib/languages');
const {
  curriculumPromptBlock,
  listStatesForFrontend,
  listSchoolFormsForState,
  primaryUpTo,
  isValidProfile,
} = require('./lib/curriculum');
const { freschMethodPromptBlock } = require('./lib/methods/fresch');

// Datenbank + Auth (optional – App läuft ohne Supabase im Gast-Modus weiter)
const { isDbEnabled } = require('./lib/db');
const auth = require('./lib/auth');
const store = require('./lib/store');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Modell-Auswahl über ENV. Default: Sonnet 4.6 (schnell + günstig).
// Für Opus: CLAUDE_MODEL=claude-opus-4-8 setzen (im Render-Dashboard, kein Redeploy nötig).
const DEFAULT_MODEL = 'claude-sonnet-4-6';
// Sicherheits-Check gegen Tippfehler in der ENV-Variable: muss mit "claude-" beginnen.
const ENV_MODEL = (process.env.CLAUDE_MODEL || '').trim();
const MODEL = /^claude-/i.test(ENV_MODEL) ? ENV_MODEL : DEFAULT_MODEL;
if (ENV_MODEL && ENV_MODEL !== MODEL) {
  console.error(
    `\n[FehlerFix] ⚠️  CLAUDE_MODEL="${ENV_MODEL}" sieht falsch aus (muss mit "claude-" anfangen).`
  );
  console.error(`[FehlerFix] Fallback auf "${DEFAULT_MODEL}".\n`);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('\n[FehlerFix] ⚠️  ANTHROPIC_API_KEY ist nicht gesetzt!');
  console.error('[FehlerFix] Lege eine .env-Datei an (siehe .env.example) und trage deinen Key ein.');
  console.error('[FehlerFix] Server startet trotzdem – Endpoints liefern dann Fehler bis Key gesetzt ist.\n');
}

// Lazy-Init: kein Crash beim Start, falls Key fehlt – stattdessen klare Fehlermeldung bei Requests
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

app.use(express.json({ limit: '30mb' }));
app.use(cookieParser());
// Hängt req.student ODER req.teacher an, je nach Session-Cookie (sonst beide null)
app.use(auth.attachUser);

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
  const { listLanguages } = require('./lib/languages');
  const { listStateCodes } = require('./lib/curriculum');
  res.json({
    ok: true,
    apiKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    provider: 'anthropic',
    model: MODEL,
    authEnabled: isDbEnabled,
    // Diagnose: zeigt NUR ob/wie lang die Env-Variablen ankommen, nie die Werte selbst
    envCheck: {
      SUPABASE_URL: process.env.SUPABASE_URL ? `set (${process.env.SUPABASE_URL.length})` : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
        ? `set (${process.env.SUPABASE_SERVICE_ROLE_KEY.length} chars, startsWith:${process.env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 3)})`
        : 'MISSING',
      SESSION_SECRET: process.env.SESSION_SECRET ? 'set' : 'MISSING',
    },
    languages: listLanguages(),
    supportedStates: listStateCodes(),
    statesWithDetailedCurriculum: ['HE'],
    methods: ['FRESCH'],
    time: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────
// Profile-Optionen: Bundesländer und Schulformen für das Frontend
// ─────────────────────────────────────────────────────────────

// Liste aller Bundesländer (für den Profile-Screen)
app.get('/api/profile/states', (req, res) => {
  res.json({ states: listStatesForFrontend() });
});

// Schulformen + Primarstufen-Grenze für ein bestimmtes Bundesland
app.get('/api/profile/school-forms', (req, res) => {
  const state = String(req.query.state || '').trim();
  const forms = listSchoolFormsForState(state);
  if (!forms.length) {
    return res.status(404).json({ error: 'Bundesland unbekannt oder ohne hinterlegte Schulformen.' });
  }
  res.json({
    state,
    schoolForms: forms,
    primaryUpTo: primaryUpTo(state),
  });
});

// ─────────────────────────────────────────────────────────────
// AUTH-ROUTEN (nur aktiv wenn Supabase konfiguriert ist)
// ─────────────────────────────────────────────────────────────
function requireDb(req, res, next) {
  if (!isDbEnabled) {
    return res.status(503).json({
      error: 'Login ist gerade nicht verfügbar (Datenbank nicht verbunden).',
      code: 'DB_DISABLED',
    });
  }
  next();
}

// Serialisiert einen Studenten fürs Frontend (ohne Hashes)
function publicStudent(s) {
  return {
    id: s.id,
    role: 'student',
    authMethod: s.auth_method,
    email: s.email || null,
    displayName: s.display_name || null,
    classId: s.class_id || null,
    profile: s.profile || {},
  };
}

function publicTeacher(t) {
  return {
    id: t.id,
    role: 'teacher',
    email: t.email,
    displayName: t.display_name || null,
  };
}

// Wer bin ich? (für Auto-Login beim Seitenaufruf)
app.get('/api/auth/me', (req, res) => {
  let user = null;
  if (req.teacher) user = publicTeacher(req.teacher);
  else if (req.student) user = publicStudent(req.student);
  res.json({ authEnabled: isDbEnabled, user });
});

// E-Mail-Registrierung
app.post('/api/auth/register-email', requireDb, async (req, res) => {
  try {
    const { email, password, profile } = req.body || {};
    const student = await auth.registerEmail({
      email,
      password,
      profile: normalizeProfile(profile) || {},
    });
    auth.setSessionCookie(res, auth.signToken(student));
    res.json({ user: publicStudent(student) });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// E-Mail-Login
app.post('/api/auth/login-email', requireDb, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const student = await auth.loginEmail({ email, password });
    auth.setSessionCookie(res, auth.signToken(student));
    res.json({ user: publicStudent(student) });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Klassencode-Registrierung (Name + PIN)
app.post('/api/auth/register-class', requireDb, async (req, res) => {
  try {
    const { classCode, displayName, pin } = req.body || {};
    const student = await auth.registerClassCode({ classCode, displayName, pin });
    auth.setSessionCookie(res, auth.signToken(student));
    res.json({ user: publicStudent(student) });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Klassencode-Login (Klassencode + Name + PIN)
app.post('/api/auth/login-class', requireDb, async (req, res) => {
  try {
    const { classCode, displayName, pin } = req.body || {};
    const student = await auth.loginClassCode({ classCode, displayName, pin });
    auth.setSessionCookie(res, auth.signToken(student));
    res.json({ user: publicStudent(student) });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Klasse beitreten (für eingeloggte E-Mail-Schüler, via Seitenmenü)
app.post('/api/auth/join-class', requireDb, auth.requireStudent, async (req, res) => {
  try {
    const { classCode } = req.body || {};
    const { student, className } = await auth.joinClass(req.student.id, classCode);
    res.json({ user: publicStudent(student), className });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Klassencode nachschlagen (Vorschau Name/Profil vor Registrierung)
app.get('/api/auth/class/:code', requireDb, async (req, res) => {
  try {
    const cls = await auth.findClass(req.params.code);
    res.json({ classCode: cls.class_code, name: cls.name, grade: cls.grade, schoolType: cls.school_type, state: cls.state });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  auth.clearSessionCookie(res);
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────
// LEHRER-ROUTEN
// ─────────────────────────────────────────────────────────────

// Lehrer-Registrierung
app.post('/api/teacher/register', requireDb, async (req, res) => {
  try {
    const { email, password, displayName } = req.body || {};
    const teacher = await auth.registerTeacher({ email, password, displayName });
    auth.setSessionCookie(res, auth.signToken(teacher, 'teacher'));
    res.json({ user: publicTeacher(teacher) });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Lehrer-Login
app.post('/api/teacher/login', requireDb, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const teacher = await auth.loginTeacher({ email, password });
    auth.setSessionCookie(res, auth.signToken(teacher, 'teacher'));
    res.json({ user: publicTeacher(teacher) });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Meine Klassen (mit Schülerzahl)
app.get('/api/teacher/classes', requireDb, auth.requireTeacher, async (req, res) => {
  try {
    const classes = await store.listTeacherClasses(req.teacher.id);
    res.json({ classes });
  } catch (e) {
    res.status(500).json({ error: 'Klassen konnten nicht geladen werden.' });
  }
});

// Neue Klasse anlegen → Klassencode
app.post('/api/teacher/classes', requireDb, auth.requireTeacher, async (req, res) => {
  try {
    const { name, state, schoolType, grade, language } = req.body || {};
    const cls = await auth.createClassForTeacher(req.teacher.id, {
      name,
      state,
      schoolType,
      grade: grade ? Number(grade) : null,
      language,
    });
    res.json({ class: cls });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Schüler einer Klasse (mit Kurz-Fortschritt)
app.get('/api/teacher/classes/:classId/students', requireDb, auth.requireTeacher, async (req, res) => {
  try {
    const cls = await store.getTeacherClass(req.teacher.id, req.params.classId);
    if (!cls) return res.status(403).json({ error: 'Kein Zugriff auf diese Klasse.' });
    const students = await store.listClassStudents(cls.id);
    res.json({ class: cls, students });
  } catch (e) {
    res.status(500).json({ error: 'Schüler konnten nicht geladen werden.' });
  }
});

// Vollständiges Fehlerprofil + Verlauf eines Schülers
app.get('/api/teacher/students/:studentId', requireDb, auth.requireTeacher, async (req, res) => {
  try {
    const allowed = await store.studentBelongsToTeacher(req.params.studentId, req.teacher.id);
    if (!allowed) return res.status(403).json({ error: 'Kein Zugriff auf diese/n Schüler/in.' });
    const detail = await store.getStudentDetail(req.params.studentId);
    if (!detail) return res.status(404).json({ error: 'Schüler/in nicht gefunden.' });
    res.json({ student: detail });
  } catch (e) {
    res.status(500).json({ error: 'Details konnten nicht geladen werden.' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────────────────────
// SESSION-STATE / CUSTOM MEMORY
// ─────────────────────────────────────────────────────────────
const sessions = {};

// Sessions liegen im RAM. Damit der Speicher nicht unbegrenzt wächst (viele
// Schüler über die Zeit), werden inaktive Sessions nach SESSION_TTL_MS entfernt.
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 Stunden
const SESSION_SWEEP_MS = 60 * 60 * 1000; // stündlich aufräumen

function getSession(sessionId) {
  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      // Schüler-Profil (für altersgerechte Themen, Komplexität, Bewertung)
      profile: null, // { grade, schoolType, state, language }

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

      // Lifecycle
      createdAt: Date.now(),
    };
  }
  sessions[sessionId].lastAccess = Date.now();
  return sessions[sessionId];
}

// Periodisches Aufräumen alter Sessions (verhindert Memory-Leak im Dauerbetrieb)
setInterval(() => {
  const now = Date.now();
  let removed = 0;
  for (const [id, s] of Object.entries(sessions)) {
    if (now - (s.lastAccess || s.createdAt || 0) > SESSION_TTL_MS) {
      delete sessions[id];
      removed++;
    }
  }
  if (removed > 0) {
    console.log(`[sessions] ${removed} inaktive Sessions aufgeräumt, ${Object.keys(sessions).length} aktiv.`);
  }
}, SESSION_SWEEP_MS).unref(); // unref: blockiert den Prozess-Exit nicht

// Normalisiert das Profil. Auto-Grundschule berücksichtigt bundesland-spezifische
// Primarstufen-Grenzen: BE/BB haben Grundschule bis Klasse 6, alle anderen bis Klasse 4.
function normalizeProfile(p) {
  if (!p) return null;
  const grade = Number(p.grade) || null;
  const state = String(p.state || '').trim() || null;
  let schoolType = String(p.schoolType || '').trim() || null;

  const primary = primaryUpTo(state);
  if (grade && grade >= 1 && grade <= primary) {
    schoolType = 'Grundschule';
  }

  return {
    grade,
    schoolType,
    state,
    language: String(p.language || '').trim() || DEFAULT_LANGUAGE,
  };
}

/**
 * Zentraler Zugriff auf den Lern-State, egal ob eingeloggt oder Gast.
 *   - Eingeloggt (Supabase): lädt/speichert persistent aus student_state.
 *   - Gast (kein Login / keine DB): nutzt das in-memory sessions-Objekt (flüchtig).
 *
 * Gibt { state, save, saveProfile, persistent, studentId } zurück.
 * Die Routen mutieren `state` und rufen am Ende `await save()`.
 */
async function resolveState(req, bodySessionId) {
  if (req.student) {
    const state = await store.loadStudentState(req.student.id, req.student.profile);
    return {
      state,
      studentId: req.student.id,
      persistent: true,
      save: () => store.saveStudentState(req.student.id, state),
      saveProfile: (p) => store.saveStudentProfile(req.student.id, p),
      log: (entry) => store.logExercise(req.student.id, entry),
    };
  }
  // Gast-Fallback (flüchtig, überlebt keinen Server-Neustart)
  const state = getSession(bodySessionId);
  return {
    state,
    studentId: null,
    persistent: false,
    save: async () => {},        // Objekt liegt bereits im sessions-Map
    saveProfile: async () => {},
    log: async () => {},
  };
}

/**
 * Übersetzt Profil in eine Beschreibung für die KI.
 * Wird in alle relevanten Prompts eingebaut.
 */
function profileToPromptBlock(profile) {
  if (!profile || !profile.grade) {
    return 'SCHÜLER-PROFIL: nicht angegeben – nimm mittleres Sekundarstufe-I-Niveau (Klasse 6-8) an.\n';
  }
  const grade = profile.grade;
  const school = profile.schoolType || 'unbekannt';
  const stateLabel = profile.state || 'unbekannt';
  let stage;
  if (grade <= 4) stage = 'Grundschule (Primärstufe)';
  else if (grade <= 10) stage = 'Sekundarstufe I';
  else stage = 'Sekundarstufe II (Oberstufe, Richtung Abitur)';

  return (
    'SCHÜLER-PROFIL:\n' +
    `- Klassenstufe: ${grade}\n` +
    `- Schulform: ${school}\n` +
    `- Bundesland: ${stateLabel}\n` +
    `- Bildungsstufe: ${stage}\n` +
    '- Passe Themen, Wortschatz, Satzkomplexität und Schwierigkeit der Übungen ' +
    'an dieses Niveau an. Keine kindlichen Themen für ältere Schüler (z.B. keine ' +
    '„Wenn ich Superkräfte hätte"-Aufgaben für eine 12. Klasse). Bei jüngeren Klassen ' +
    'einfache Sätze, geläufiger Wortschatz.\n'
  );
}

/**
 * Baut den kompletten Kontext-Block für die KI: Profil + Curriculum + Methodik.
 * Wird in allen Prompts genutzt – eine zentrale Stelle, sauber erweiterbar.
 * Für Deutsch wird zusätzlich die FRESCH-Methodik mitgegeben.
 */
function buildContextBlock(profile) {
  const blocks = [
    profileToPromptBlock(profile),
    curriculumPromptBlock(profile),
  ];
  // FRESCH ist eine deutsche Rechtschreibmethode – nur bei Sprache "de"
  const lang = profile?.language || DEFAULT_LANGUAGE;
  if (lang === 'de') {
    blocks.push(freschMethodPromptBlock());
  }
  return blocks.join('\n');
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
 * Anthropic Messages API: Bild als base64 source-Block.
 */
function toImageBlock(dataUrl) {
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  const mediaType = match ? match[1] : 'image/jpeg';
  const data = match ? match[2] : dataUrl;
  return {
    type: 'image',
    source: { type: 'base64', media_type: mediaType, data },
  };
}

/**
 * Wrapper für Claude-Calls. Liefert den Antwort-String und loggt Dauer + Tokens.
 * userContent kann ein String ODER ein Array aus text/image-Blöcken sein.
 */
/**
 * Erkennt transiente Netzwerk-Fehler, bei denen ein Retry sinnvoll ist.
 * (Premature close, ECONNRESET, fetch failed, 5xx, 429 Rate-Limit)
 */
function isRetryableError(err) {
  if (!err) return false;
  const msg = String(err.message || '').toLowerCase();
  if (
    msg.includes('premature close') ||
    msg.includes('econnreset') ||
    msg.includes('fetch failed') ||
    msg.includes('socket hang up') ||
    msg.includes('etimedout') ||
    msg.includes('network') ||
    msg.includes('connection')
  ) return true;
  const s = err.status;
  return s === 429 || (s >= 500 && s < 600);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callClaude({ label, systemPrompt, userContent, maxTokens = 4000, maxRetries = 3 }) {
  if (!anthropic) {
    const e = new Error('ANTHROPIC_API_KEY ist nicht gesetzt – bitte in .env eintragen und Server neu starten.');
    e.status = 500;
    throw e;
  }

  let lastErr;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const started = Date.now();
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: typeof userContent === 'string'
              ? [{ type: 'text', text: userContent }]
              : userContent,
          },
        ],
      });
      const elapsed = Date.now() - started;
      const text = (response.content || [])
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('\n');
      const stop = response.stop_reason;
      const usage = response.usage;

      console.log(
        `[${label}] Claude-Antwort nach ${elapsed}ms` +
          (attempt > 1 ? ` (Versuch ${attempt})` : '') +
          ` (${text.length} chars, stop=${stop}, ` +
          `tokens: in=${usage?.input_tokens}, out=${usage?.output_tokens})`
      );

      if (!text) {
        console.error(`[${label}] LEERE Antwort! stop_reason=${stop}`);
        console.error(`[${label}] content:`, JSON.stringify(response.content)?.slice(0, 500));
        if (stop === 'max_tokens') {
          console.error(`[${label}] → max_tokens war zu niedrig. Erhöhen.`);
        }
      }
      return { text, elapsed, stop, raw: response };
    } catch (err) {
      const elapsed = Date.now() - started;
      lastErr = err;
      const retryable = isRetryableError(err);
      console.error(
        `[${label}] Claude-Fehler nach ${elapsed}ms (Versuch ${attempt}/${maxRetries}):`,
        err.message || err
      );
      if (err.status) console.error(`[${label}] Status:`, err.status);
      if (err.error) console.error(`[${label}] Detail:`, JSON.stringify(err.error)?.slice(0, 500));

      if (!retryable || attempt === maxRetries) {
        throw err;
      }
      // Exponential Backoff: 1s, 2s, 4s
      const wait = 1000 * Math.pow(2, attempt - 1);
      console.warn(`[${label}] → Retry in ${wait}ms (Fehler ist transient: ${err.message})`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

// ─────────────────────────────────────────────────────────────
// ROUTE 1: /api/analyze – Handschrift → initiale Feature-Table
// ─────────────────────────────────────────────────────────────
app.post('/api/analyze', async (req, res) => {
  const { sessionId, images, profile } = req.body || {};
  if ((!sessionId && !req.student) || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: 'Anmeldung/sessionId und images sind erforderlich.' });
  }

  const ctx = await resolveState(req, sessionId);
  const session = ctx.state;
  if (profile && typeof profile === 'object') {
    session.profile = normalizeProfile(profile);
    if (ctx.persistent) await ctx.saveProfile(session.profile);
  }
  const sizesKb = images.map((d) => Math.round((d.length * 0.75) / 1024));
  console.log(`[analyze] ${ctx.persistent ? 'Student ' + ctx.studentId : 'Gast ' + sessionId}`);
  console.log(`[analyze] Profil: ${JSON.stringify(session.profile)}`);
  console.log(`[analyze] Bilder empfangen: ${sizesKb.join('kb, ')}kb. Schicke an Claude (${MODEL})...`);

  // Anthropic-Konvention: Bilder zuerst, dann Text-Anweisung
  const userContent = [
    ...images.map(toImageBlock),
    {
      type: 'text',
      text:
        buildContextBlock(session.profile) + '\n' +
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
  ];

  try {
    const lang = getLanguage(session.profile?.language);
    const { text } = await callClaude({
      label: 'analyze',
      systemPrompt:
        lang.teacherRole +
        ' Du analysierst Handschrift-Bilder und baust ein strukturiertes Fehlerprofil. ' +
        'Du passt deine Erwartungen an die angegebene Klassenstufe an. ' +
        'Du antwortest IMMER ausschließlich mit gültigem JSON (kein Markdown-Block, kein Erklärtext).',
      userContent,
      maxTokens: 4000,
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

    await ctx.save();
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
  if (!sessionId && !req.student) return res.status(400).json({ error: 'Anmeldung/sessionId erforderlich.' });

  const ctx = await resolveState(req, sessionId);
  const session = ctx.state;
  if (!session.featureTable || session.featureTable.length === 0) {
    // Tritt z.B. nach Server-Neustart (Gast) auf (In-Memory-State verloren).
    // code: Frontend leitet damit sauber zum Neustart statt in eine Retry-Sackgasse.
    return res.status(409).json({
      error: 'Noch keine Analyse vorhanden.',
      code: 'NO_ANALYSIS',
    });
  }

  const weighted = weightedFeatures(session.featureTable);
  weighted.sort((a, b) => b.practice_weight - a.practice_weight);

  // ── ADAPTIVE FEATURE-WAHL: EIN Feature pro Übung ─────
  // Regel:
  //  - Erste 3 Übungen: GARANTIERT auf Top-Feature (häufigster Fehler aus den Onboarding-Texten)
  //  - Danach: bei "poor" beim alten Feature bleiben, sonst neu Top-Feature
  let focusFeature;
  if (session.exercisesCompleted < 3) {
    focusFeature = weighted[0]?.name;
  } else if (session.lastExercisePerformance === 'poor' && session.lastFocusFeature) {
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
      'LÜCKENTEXT: Erstelle einen ZUSAMMENHÄNGENDEN kleinen Text (4-5 Sätze, eine kleine ' +
      'Geschichte / Beobachtung mit rotem Faden). Die Übung muss DICHT sein – viele ' +
      'Entscheidungsstellen, nicht nur ein, zwei.\n' +
      'ANZAHL: Erzeuge MINDESTENS 6, besser 7-10 Lücken/Entscheidungsstellen über den Text. ' +
      'Lieber mehr Stellen als längerer Text – der Text bleibt etwa gleich lang, aber prall gefüllt ' +
      'mit Übungsmöglichkeiten zum Fokus-Feature.\n\n' +
      'ES GIBT ZWEI ARTEN von Lückentext, je nach Fokus-Feature:\n\n' +
      'A) RECHTSCHREIB-FEATURES (ie/i, ss/ß, Doppelkonsonanten, Dehnung, das/dass usw.):\n' +
      '   - Setze "___" für die Buchstabengruppe, wo das Feature greift ' +
      '(z.B. "T___ger"→"ie", "Stra___e"→"ß", "da___ Haus"→"s").\n' +
      '   - VERBOTEN: Lücken auf Satzzeichen, Bindestrichen, Leerzeichen, Zahlen oder ganzen Wörtern.\n' +
      '   - Baue möglichst viele echte Vorkommen des Features ein (Ziel 6-10).\n\n' +
      'B) ZEICHENSETZUNGS-FEATURES (Kommasetzung, Satzzeichen):\n' +
      '   - Hier wird NICHT mit "___" gearbeitet. Stattdessen: Schreibe den Text und markiere ' +
      'JEDE Stelle, an der MÖGLICHERWEISE ein Komma stehen könnte, mit dem Platzhalter " [ ] " ' +
      '(Leerzeichen, eckige Klammer auf, Leerzeichen, eckige Klammer zu, Leerzeichen).\n' +
      '   - WICHTIG: Markiere SOWOHL Stellen, an denen ein Komma hingehört, ALS AUCH Stellen, an ' +
      'denen KEINS hingehört (Fallen). So entscheidet der Nutzer pro Stelle „Komma oder nicht".\n' +
      '   - Ziel: 6-10 solcher Entscheidungsstellen über den Text verteilt.\n' +
      '   - Im correctText steht der Text mit den KORREKT gesetzten Kommas (und ohne Klammern).\n' +
      '   - instruction-Beispiel: "Schreibe den Text ab. Setze an den markierten Stellen ein Komma – ' +
      'aber nur dort, wo eins hingehört!"\n\n' +
      'instruction-Beispiel (Rechtschreibung): "Schreibe den Text ab und fülle die Lücken."',

    error_text:
      'FEHLERTEXT: Erstelle einen ZUSAMMENHÄNGENDEN kleinen Text (3-5 Sätze, kleine ' +
      'Geschichte mit Sinn) mit 2-4 eingebauten Rechtschreibfehlern – ALLE zum Fokus-Feature.\n' +
      'STRENGE REGELN:\n' +
      '- Fehler nur in echten Wörtern, NIEMALS Satzzeichen weglassen/verschieben.\n' +
      '- Fehler müssen authentisch sein – Verwechslungen, die Lerner dieser Klassenstufe ' +
      'wirklich machen (z.B. "Tir" statt "Tier", nicht künstliche Fantasiefehler).\n' +
      '- Alle anderen Wörter im Text sind 100% korrekt geschrieben.\n' +
      '- Die Schülerin/der Schüler schreibt den korrigierten Text handschriftlich ab.\n' +
      'instruction-Beispiel: "In diesem Text sind ein paar Fehler. Schreibe ihn richtig ab."',

    audio_dictation:
      'AUDIO-DIKTAT: Erstelle einen ZUSAMMENHÄNGENDEN, kurzen, vollständig KORREKTEN Text ' +
      '(3-5 Sätze, kleine Geschichte mit Sinn).\n' +
      'STRENGE REGELN:\n' +
      '- Text wird per Sprachausgabe langsam vorgelesen, das Kind schreibt mit.\n' +
      '- Text enthält 2-4 Wörter, in denen das Fokus-Feature vorkommt (klar hörbar, aber ' +
      'rechtschreiblich eine Herausforderung).\n' +
      '- KEINE Lücken, KEINE Fehler, KEINE Sonderzeichen außer normale Satzzeichen.\n' +
      '- KEINE Anführungszeichen, KEINE Bindestrich-Komposita ("Start-Ups"), KEINE Abkürzungen, ' +
      'KEINE Zahlen, KEINE Aufzählungen, KEINE Fremdwörter.\n' +
      '- Text muss FLÜSSIG vorlesbar sein – natürlicher Sprachfluss.\n' +
      '- Setze displayText auf einen leeren String "".\n' +
      'instruction-Beispiel: "Hör gut zu und schreibe auf, was du hörst."',
  };

  const prompt =
    'Du erstellst EINE handschriftliche Rechtschreibübung für eine Schülerin / einen Schüler.\n\n' +
    buildContextBlock(session.profile) + '\n' +
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
    `ÜBUNGSTYP FÜR DIESE ÜBUNG (fest vorgegeben): "${exType}"\n` +
    `FOKUS-FEATURE FÜR DIESE ÜBUNG (fest vorgegeben): "${focusFeature}"\n` +
    `Diese Übung trainiert AUSSCHLIESSLICH dieses eine Feature. Keine anderen Themen.\n\n` +
    typeDescriptions[exType] + '\n\n' +
    'GLOBAL KRITISCHE REGELN (gelten IMMER):\n' +
    '- Aufgabenstellung (instruction) darf NIEMALS die Lösung verraten. ' +
    'Erwähne NIE konkrete Wörter aus dem Text. Schlechtes Beispiel: "Wie schreibt man Zoo-Tier?".\n' +
    '- Der Text MUSS eine kohärente kleine Geschichte oder Beobachtung sein. ' +
    'Sätze nehmen aufeinander Bezug, keine zusammenhanglosen Einzelsätze.\n' +
    '- Wortschatz und Komplexität GENAU passend zur Klassenstufe.\n' +
    '- KEINE englischen Begriffe, KEINE Anglizismen, KEINE Bindestrich-Komposita ("Start-Ups", ' +
    '"E-Mail", "Hands-On") – die machen rechtschreiblich keinen Sinn als Übung.\n' +
    '- KEINE Eigennamen mit Sonderschreibung (z.B. "iPhone", "McDonald\'s") – nur deutsche ' +
    'Alltagswörter, die ein Schüler dieser Klasse aktiv schreiben sollte.\n' +
    '- Vor der finalen Antwort PRÜFE selbst: Würde ein Lehrer diese Übung im Heft akzeptieren? ' +
    'Wenn nein, formuliere um.\n\n' +
    'ANTWORT AUSSCHLIESSLICH ALS JSON:\n' +
    '{\n' +
    `  "type": "${exType}",\n` +
    '  "focusFeature": "<exakter Name aus Feature-Table>",\n' +
    '  "topic": "<kurzes, klares Thema dieser Übung für die Überschrift, z.B. \\"Kommasetzung\\", ' +
    '\\"ie/i-Schreibung\\", \\"das/dass\\", \\"Doppelkonsonanten\\">",\n' +
    '  "instruction": "<altersgerechte Aufgabenstellung OHNE Antworten zu verraten>",\n' +
    '  "tips": ["<Achtsamkeit 1: worauf das Kind achten soll>", "<Achtsamkeit 2>", "<Achtsamkeit 3>"],\n' +
    '  "displayText": "<der Text, der angezeigt wird – Lücken/Markierungen bei cloze_text, Fehler bei error_text, LEER bei audio_dictation>",\n' +
    '  "correctText": "<die vollständig korrekte Lösung, die geschrieben werden sollte – bei audio_dictation: der vorzulesende Text>",\n' +
    '  "explanation": "<1-2 Sätze, erklärt die Regel/das WARUM des Features – wird NACH der Bewertung gezeigt>"\n' +
    '}\n\n' +
    'ZU "topic": kurzes Schlagwort, das oben über der Aufgabe als Überschrift steht. Macht sofort klar, ' +
    'worum es geht (das Thema darf genannt werden – nur die konkreten Lösungswörter nicht).\n' +
    'ZU "tips": geben 2-3 konkrete Achtsamkeiten, worauf das Kind bei DIESEM Thema achten soll ' +
    '(kindgerecht, kurz, ohne die Lösung zu verraten). Beziehe wenn passend die FRESCH-Strategie ein.';

  console.log(
    `[next-exercise] Typ: ${exType}, Fokus: "${focusFeature}" (Gewicht ${focusEntry?.practice_weight}), ` +
      `Performance: ${session.lastExercisePerformance || '-'}, Übung #${session.exercisesCompleted + 1}`
  );

  try {
    const lang = getLanguage(session.profile?.language);
    const { text } = await callClaude({
      label: 'next-exercise',
      systemPrompt:
        lang.teacherRole +
        ' Du erstellst gezielte Rechtschreib-/Grammatik-Übungen mit altersgerechten Erklärungen. ' +
        'Du antwortest IMMER ausschließlich mit gültigem JSON (kein Markdown-Block, kein Erklärtext).',
      userContent: prompt,
      maxTokens: 2500,
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
    // Das vorgegebene Fokus-Feature erzwingen (Server-side Truth)
    if (exercise.focusFeature !== focusFeature) {
      console.warn(`[next-exercise] KI lieferte Fokus "${exercise.focusFeature}", erzwinge "${focusFeature}".`);
      exercise.focusFeature = focusFeature;
    }
    // Bei audio_dictation: displayText immer leer halten (sonst sieht das Kind den Text)
    if (exType === 'audio_dictation') {
      exercise.displayText = '';
    }

    session.lastFocusFeature = focusFeature;
    session.lastExercise = exercise;

    console.log(
      `[next-exercise] OK – Typ: ${exercise.type}, Fokus: "${focusFeature}", ` +
        `Text-Länge: ${(exercise.correctText || '').length} chars`
    );
    await ctx.save();
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
  if ((!sessionId && !req.student) || !image) {
    return res.status(400).json({ error: 'Anmeldung/sessionId und image erforderlich.' });
  }

  const ctx = await resolveState(req, sessionId);
  const session = ctx.state;
  const last = session.lastExercise;
  if (!last || !last.correctText) {
    return res.status(409).json({
      error: 'Keine aktive Übung gefunden.',
      code: 'NO_ACTIVE_EXERCISE',
    });
  }

  const sizeKb = Math.round((image.length * 0.75) / 1024);
  console.log(`[submit] ${ctx.persistent ? 'Student ' + ctx.studentId : 'Gast ' + sessionId}, Bild: ${sizeKb}kb, Fokus: "${session.lastFocusFeature}"`);

  // Vision-Prompt: KI liest die Schrift, vergleicht, bewertet, erkennt neue Features
  const gradeText =
    buildContextBlock(session.profile) + '\n' +
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
    'altersangemessenen Erklärung. Die Erklärung MUSS die FRESCH-Strategie (Schwingen / Verlängern / ' +
    'Ableiten / Merken) explizit nennen und am konkreten Wort vorführen. ' +
    'Beispiel-Erklärung (Verlängern): „Verlängere das Wort: Berg → die Berge. Du hörst das g am Ende, ' +
    'also schreibst du Berg mit g, nicht mit k." KEINE generischen Tipps. ' +
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
    '"fresch_strategy": "Schwingen" | "Verlängern" | "Ableiten" | "Merken", ' +
    '"explanation": "<altersgerechte Erklärung, die die FRESCH-Strategie am Wort vorführt>", ' +
    '"feature": "<Feature-Name aus Memory oder neu>" }\n' +
    '  ],\n' +
    '  "results": [\n' +
    '    { "feature":"<exakter Name aus Memory>", "right":N, "wrong":N, "feedback":"...", "new_mastery":0-100 }\n' +
    '  ],\n' +
    '  "new_features_detected": [\n' +
    '    { "name":"...", "reason":"...", "evidence":"...", "wrong":N, "initial_mastery":0-100 }\n' +
    '  ]\n' +
    '}';

  // Anthropic-Konvention: Bild zuerst, dann Anweisungstext
  const userContent = [
    toImageBlock(image),
    { type: 'text', text: gradeText },
  ];

  let aiGrading = null;
  try {
    const lang = getLanguage(session.profile?.language);
    const { text } = await callClaude({
      label: 'submit',
      systemPrompt:
        lang.graderRole +
        ' Du antwortest IMMER ausschließlich mit gültigem JSON (kein Markdown-Block, kein Erklärtext).',
      userContent,
      maxTokens: 3000,
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

  // Persistieren + (bei eingeloggten Schülern) fürs Lehrer-Dashboard loggen
  await ctx.save();
  if (ctx.persistent) {
    await ctx.log({
      feature: session.lastFocusFeature,
      exerciseType: last.type,
      topic: last.topic || null,
      score: Math.round(ratio * 100),
    });
  }

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

// SPA-Fallback: alle nicht-API GETs → index.html.
// Middleware-Form (statt app.get('*', ...)) ist robust gegen path-to-regexp-Versionen.
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n[FehlerFix] ✏️  Server läuft auf http://localhost:${PORT}`);
  console.log(`[FehlerFix] Modell: ${MODEL} (Anthropic Claude)`);
  console.log(`[FehlerFix] Architektur: Feature-Table-Memory + adaptive Gewichtung\n`);
});
