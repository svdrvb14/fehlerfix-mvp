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
const mastery = require('./lib/mastery');
const exercises = require('./lib/exercises');
const wordRegister = require('./lib/wordregister');
const island = require('./lib/island');
const imageLibrary = require('./lib/imagelibrary');

// Datenbank + Auth (optional – App läuft ohne Supabase im Gast-Modus weiter)
const { supabase, isDbEnabled } = require('./lib/db');
const auth = require('./lib/auth');
const store = require('./lib/store');
const exerciseBank = require('./lib/exercisebank');
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

// ─────────────────────────────────────────────────────────────
// CORS – nötig, weil die native App (iOS/Android) ihre Oberfläche lokal
// ausliefert und die API damit von einem ANDEREN Origin aufruft.
// Erlaubt sind nur die WebView-Origins von Capacitor plus optional
// zusätzliche Origins aus EXTRA_CORS_ORIGINS (kommagetrennt).
// ─────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = new Set([
  'capacitor://localhost', // iOS
  'ionic://localhost',     // ältere iOS-WebViews
  'http://localhost',      // Android
  'https://localhost',
  'http://localhost:3000', // lokale Entwicklung
  ...String(process.env.EXTRA_CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
]);

app.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204); // Preflight
  next();
});

// Hängt req.student ODER req.teacher an (Cookie im Web, Bearer-Token nativ)
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
    const { email, password, displayName, profile } = req.body || {};
    await auth.registerEmail({
      email,
      password,
      displayName,
      profile: normalizeProfile(profile) || {},
    });
    // KEIN Auto-Login: nach der Registrierung soll sich der Nutzer normal anmelden.
    res.json({ registered: true });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// E-Mail-Login
app.post('/api/auth/login-email', requireDb, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const student = await auth.loginEmail({ email, password });
    const token = auth.signToken(student);
    auth.setSessionCookie(res, token);
    res.json({ user: publicStudent(student), token });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Klassencode-Registrierung (Name + PIN)
app.post('/api/auth/register-class', requireDb, async (req, res) => {
  try {
    const { classCode, displayName, pin } = req.body || {};
    await auth.registerClassCode({ classCode, displayName, pin });
    // KEIN Auto-Login: erst anmelden lassen.
    res.json({ registered: true });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Klassencode-Login (Klassencode + Name + PIN)
app.post('/api/auth/login-class', requireDb, async (req, res) => {
  try {
    const { classCode, displayName, pin } = req.body || {};
    const student = await auth.loginClassCode({ classCode, displayName, pin });
    const token = auth.signToken(student);
    auth.setSessionCookie(res, token);
    res.json({ user: publicStudent(student), token });
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

// Namen nachträglich setzen/ändern (Menü)
app.post('/api/auth/update-name', requireDb, auth.requireStudent, async (req, res) => {
  try {
    const student = await auth.updateDisplayName(req.student.id, req.body?.displayName);
    res.json({ user: publicStudent(student) });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Aktuelle Klasse des eingeloggten Schülers (fürs Menü)
app.get('/api/auth/my-class', requireDb, auth.requireStudent, async (req, res) => {
  try {
    const cls = await store.getClassBrief(req.student.class_id);
    res.json({ class: cls ? { id: cls.id, name: cls.name, code: cls.class_code } : null });
  } catch (e) {
    res.status(500).json({ error: 'Klasse konnte nicht geladen werden.' });
  }
});

// Schüler-Dashboard: Fortschritt + ob schon eine Analyse existiert
app.get('/api/student/dashboard', requireDb, auth.requireStudent, async (req, res) => {
  try {
    const st = await store.loadStudentState(req.student.id, req.student.profile);
    const level = st.level || 1;
    const points = st.points || 0;
    res.json({
      displayName: req.student.display_name || req.student.email || 'Schüler/in',
      hasAnalysis: (st.featureTable || []).length > 0,
      level,
      points,
      exercisesCompleted: st.exercisesCompleted || 0,
      streakDays: st.streakDays || 0,
      bestStreak: st.bestStreak || 0,
      pointsToNextLevel: level * 100 - points,
      levelProgressPercent: ((points % 100) / 100) * 100,
    });
  } catch (e) {
    res.status(500).json({ error: 'Dashboard konnte nicht geladen werden.' });
  }
});

// Fehlerprofil in Schülersicht (gleiche Daten wie beim Lehrer)
app.get('/api/student/profile-detail', requireDb, auth.requireStudent, async (req, res) => {
  try {
    const st = await store.loadStudentState(req.student.id, req.student.profile);
    const featureTable = (st.featureTable || []).slice().sort(
      (a, b) => (a.mastery ?? 100) - (b.mastery ?? 100)
    );
    res.json({
      errorProfile: featureTable,
      // Merkwörter: nur Wörter, die WIEDERHOLT falsch geschrieben wurden.
      // Leere Liste heißt: es gibt keine – nicht, dass etwas fehlt.
      wordRegister: wordRegister.activeWords(st.wordRegister).map((e) => ({
        word: e.word,
        wrong: e.wrong,
        variants: e.variants || [],
        strategy: e.strategy || null,
      })),
      level: st.level || 1,
      points: st.points || 0,
      exercisesCompleted: st.exercisesCompleted || 0,
      streakDays: st.streakDays || 0,
      recentExercises: (st.exerciseHistory || []).slice(-10).reverse(),
    });
  } catch (e) {
    res.status(500).json({ error: 'Fehlerprofil konnte nicht geladen werden.' });
  }
});

// Bestenliste der eigenen Klasse ( ?range=week|all )
app.get('/api/student/leaderboard', requireDb, auth.requireStudent, async (req, res) => {
  try {
    if (!req.student.class_id) {
      return res.json({ inClass: false, entries: [], meId: req.student.id });
    }
    const range = req.query.range === 'all' ? 'all' : 'week';
    const entries = await store.getClassLeaderboard(req.student.class_id, range);
    res.json({ inClass: true, range, entries, meId: req.student.id });
  } catch (e) {
    res.status(500).json({ error: 'Bestenliste konnte nicht geladen werden.' });
  }
});

// ─────────────────────────────────────────────────────────────
// "Meine Insel" – Münzen + gekaufte Gegenstände.
// ─────────────────────────────────────────────────────────────
app.get('/api/island/state', requireDb, auth.requireStudent, async (req, res) => {
  try {
    const st = await store.loadStudentState(req.student.id, req.student.profile);
    res.json({
      coins: st.coins || 0,
      items: st.islandItems || [],
      catalog: island.catalog(),
    });
  } catch (e) {
    res.status(500).json({ error: 'Insel konnte nicht geladen werden.' });
  }
});

app.post('/api/island/buy', requireDb, auth.requireStudent, async (req, res) => {
  const { itemId } = req.body || {};
  if (!itemId) return res.status(400).json({ error: 'itemId erforderlich.' });
  try {
    const st = await store.loadStudentState(req.student.id, req.student.profile);
    const result = island.buy(st, itemId);
    if (!result.ok) return res.status(400).json({ error: result.error });
    st.coins = result.coins;
    st.islandItems = result.islandItems;
    await store.saveStudentState(req.student.id, st);
    res.json({ coins: st.coins, items: st.islandItems });
  } catch (e) {
    res.status(500).json({ error: 'Kauf fehlgeschlagen.' });
  }
});

// Klassenarbeit-Upload: ein Foto → Fehler erkennen → ins Fehlerprofil mergen
app.post('/api/upload-classtest', requireDb, auth.requireStudent, async (req, res) => {
  const { image } = req.body || {};
  if (!image) return res.status(400).json({ error: 'Bild erforderlich.' });
  const ctx = await resolveState(req, null);
  const session = ctx.state;
  console.log(`[classtest] Student ${ctx.studentId}, Bild ${Math.round((image.length * 0.75) / 1024)}kb`);
  try {
    const detected = await detectFeaturesFromImages(
      session,
      [image],
      'Auf dem Bild siehst du eine handgeschriebene Klassenarbeit / einen Test einer Schülerin / eines Schülers.'
    );
    if (!session.featureTable || session.featureTable.length === 0) {
      // Noch keine Analyse → die erkannten Features werden das initiale Profil
      session.featureTable = detected.length ? detected : [
        { name: 'Groß-/Kleinschreibung', mastery: 60, right: 0, wrong: 2 },
      ];
      session.featureTable.sort((a, b) => a.mastery - b.mastery);
    } else {
      mergeDetectedFeatures(session.featureTable, detected);
    }
    session.lastFocusFeature = session.featureTable[0]?.name || null;
    store.bumpStreak(session);
    await ctx.save();
    console.log(`[classtest] ${detected.length} Features erkannt/gemergt.`);
    res.json({ success: true, detectedCount: detected.length, streakDays: session.streakDays || 0 });
  } catch (err) {
    console.error('[classtest] Fehler:', err.message);
    res.status(500).json({ error: 'Klassenarbeit konnte nicht ausgewertet werden. Versuch es nochmal.' });
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
    await auth.registerTeacher({ email, password, displayName });
    // KEIN Auto-Login: erst anmelden lassen.
    res.json({ registered: true });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Lehrer-Login
app.post('/api/teacher/login', requireDb, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const teacher = await auth.loginTeacher({ email, password });
    const token = auth.signToken(teacher, 'teacher');
    auth.setSessionCookie(res, token);
    res.json({ user: publicTeacher(teacher), token });
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
    // Auch hier: die KI zählt, wir rechnen.
    const total = Math.max(1, clamp(nf.total ?? nf.wrong ?? 1, 1, 99));
    const correct = Math.min(total, Math.max(0, clamp(nf.correct ?? 0, 0, 99)));
    const errors = total - correct;
    const init = mastery.initialFromCounts({ occurrences: total, errors });
    const feat = {
      name,
      mastery: mastery.toPercent(init.mastery),
      evidence: init.evidence,
      right: correct,
      wrong: errors,
      observations: total,
      lastSeen: new Date().toISOString().slice(0, 10),
    };
    table.push(feat);
    added.push({ ...feat, reason: nf.reason || '', evidence: nf.evidence || '' });
  }
  return added;
}

/**
 * Verrechnet die ZÄHLUNGEN der KI mit dem bestehenden Lernstand.
 * Der Prozentwert kommt aus lib/mastery.js – nicht von der KI.
 *
 * @param {Array}  table        Feature-Table des Schülers
 * @param {Array}  results      [{ feature, total, correct }]
 * @param {string} exerciseType bestimmt die Rate-Wahrscheinlichkeit
 */
function applyGradingResults(table, results, exerciseType) {
  for (const r of results || []) {
    if (!r || !r.feature) continue;

    // Kategorie zuordnen (exakt, sonst über Teilwort – die KI schreibt Namen
    // gelegentlich leicht anders)
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
    if (!match) continue;

    // Zählungen plausibilisieren
    const total = clamp(r.total, 0, 99);
    if (total <= 0) continue;
    const correct = Math.min(total, clamp(r.correct, 0, 99));

    ensureEvidence(match);

    // Vergessen anrechnen, bevor neue Evidenz dazukommt
    const days = daysSince(match.lastSeen);
    let current = mastery.applyDecay(match.mastery / 100, days);
    match.evidence = mastery.evidenceFor(current, match.evidence.total);

    // Neue Beobachtung verrechnen
    const guess = mastery.guessRateFor(exerciseType, match.name);
    const out = mastery.observe(match.evidence, { correct, total }, guess);

    match.evidence = out.evidence;
    match.mastery = mastery.toPercent(out.mastery);
    match.right = (match.right || 0) + correct;
    match.wrong = (match.wrong || 0) + (total - correct);
    match.observations = (match.observations || 0) + total;
    match.lastSeen = new Date().toISOString().slice(0, 10);
  }
}

/** Tage seit einem ISO-Datum (YYYY-MM-DD); 0 wenn unbekannt. */
function daysSince(isoDate) {
  if (!isoDate) return 0;
  const then = Date.parse(isoDate);
  if (!Number.isFinite(then)) return 0;
  return Math.max(0, (Date.now() - then) / 86400000);
}

/**
 * Ältere Profile (vor Einführung des Modells) haben nur mastery, keine Evidenz.
 * Wir leiten sie einmalig aus dem vorhandenen Wert ab, damit nichts verloren geht.
 */
function ensureEvidence(feature) {
  if (feature.evidence && Number.isFinite(feature.evidence.total)) return;
  const known = (feature.right || 0) + (feature.wrong || 0);
  feature.observations = feature.observations || known;
  feature.evidence = mastery.evidenceFor((feature.mastery ?? 50) / 100, known);
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

/**
 * Schickt Handschrift-Bilder an Claude und liefert eine erkannte Feature-Liste
 * (Rechtschreib-/Grammatik-Kategorien mit mastery + wrong). Wiederverwendet von
 * /api/analyze (Onboarding, ersetzt) und /api/upload-classtest (mergt).
 * Wirft bei Fehler; leere Erkennung → [].
 */
async function detectFeaturesFromImages(session, images, introText) {
  const userContent = [
    ...images.map(toImageBlock),
    {
      type: 'text',
      text:
        buildContextBlock(session.profile) + '\n' +
        introText + '\n' +
        'Lies die Handschrift sorgfältig. Identifiziere ALLE Rechtschreib-/Grammatik-Fehler ' +
        'und ordne sie spezifischen, trainierbaren KATEGORIEN (Features) zu.\n\n' +
        'Beispiele für Feature-Namen: "ie/i-Schreibung", "ss/ß", "Groß-/Kleinschreibung von Nomen", ' +
        '"Doppelkonsonanten", "Dehnungs-h", "das/dass", "Kommasetzung bei Aufzählungen", ' +
        '"Zusammen-/Getrenntschreibung", "seid/seit", "wider/wieder", "Endung -ig/-lich".\n\n' +
        'DEINE AUFGABE IST ZÄHLEN, NICHT BEWERTEN.\n' +
        'Gib für jede Kategorie zwei Zahlen an:\n' +
        '  occurrences = wie oft im Text eine GELEGENHEIT bestand, diese Regel anzuwenden\n' +
        '                (also alle Stellen, an denen die Regel greift – richtig UND falsch)\n' +
        '  errors      = wie viele davon FALSCH geschrieben wurden\n' +
        'Es gilt immer: errors <= occurrences.\n' +
        'Beispiel: Der Text enthält 5 Wörter mit langem i; 3 davon falsch geschrieben\n' +
        '  → { "name": "ie/i-Schreibung", "occurrences": 5, "errors": 3 }\n\n' +
        'Antworte AUSSCHLIESSLICH mit JSON in genau diesem Format:\n' +
        '{ "featureTable": [ { "name": "ie/i-Schreibung", "occurrences": 5, "errors": 3, ' +
        '"examples": ["Tier→Tir"] } ], "readSuccessfully": true }\n\n' +
        'Nimm zusätzlich 1-2 Kategorien auf, die für die Klassenstufe wichtig sind, aber im\n' +
        'Text fehlerfrei waren – mit occurrences = Anzahl der Gelegenheiten und errors = 0.\n' +
        'Den Lernstand in Prozent berechnet unser System selbst – schätze ihn NICHT.',
    },
  ];
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
  const parsed = parseJsonResponse(text); // wirft bei Parse-Fehler
  const rawTable = Array.isArray(parsed.featureTable) ? parsed.featureTable : [];
  return rawTable
    .map((f) => {
      const name = String(f.name || '').trim();
      if (!name) return null;
      // Zählungen der KI plausibilisieren, dann RECHNEN wir den Startwert.
      const errors = Math.max(0, Math.round(Number(f.errors) || 0));
      // Fallback: ältere Antwortform ohne occurrences → Fehler als Gelegenheiten annehmen
      const occurrences = Math.max(errors, Math.round(Number(f.occurrences) || errors || 1));
      const init = mastery.initialFromCounts({ occurrences, errors });
      return {
        name,
        mastery: mastery.toPercent(init.mastery),
        evidence: init.evidence,          // gewichtete Evidenz (Grundlage der Berechnung)
        right: occurrences - errors,
        wrong: errors,
        observations: occurrences,        // wie viele Gelegenheiten insgesamt beobachtet
        lastSeen: new Date().toISOString().slice(0, 10),
      };
    })
    .filter(Boolean);
}

/**
 * Mergt neu erkannte Features (z.B. aus einer Klassenarbeit) in die bestehende
 * Feature-Table: bekannte Kategorien bekommen mehr Gewicht (wrong hoch, mastery
 * Richtung erkanntem Wert), neue kommen dazu.
 */
function mergeDetectedFeatures(table, detected) {
  for (const d of detected) {
    const match = table.find((f) => norm(f.name) === norm(d.name));
    if (match) {
      // Bekannte Kategorie: die neuen Zählungen als weitere Beobachtung verrechnen.
      // Hochgeladene Texte sind freie Produktion → praktisch keine Ratechance.
      ensureEvidence(match);
      const total = Math.max(1, d.observations || (d.right + d.wrong) || 1);
      const correct = Math.max(0, Math.min(total, d.right ?? 0));
      const out = mastery.observe(
        match.evidence,
        { correct, total },
        mastery.GUESS_BY_TYPE.audio_dictation
      );
      match.evidence = out.evidence;
      match.mastery = mastery.toPercent(out.mastery);
      match.right = (match.right || 0) + correct;
      match.wrong = (match.wrong || 0) + (total - correct);
      match.observations = (match.observations || 0) + total;
      match.lastSeen = new Date().toISOString().slice(0, 10);
    } else {
      table.push(d);
    }
  }
  table.sort((a, b) => a.mastery - b.mastery);
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

  try {
    // Gemeinsame Analyse-Funktion nutzen (ein Prompt, eine Umwandlung –
    // vorher stand hier eine zweite, veraltete Kopie).
    const table = await detectFeaturesFromImages(
      session,
      images,
      'Auf den Bildern siehst du handgeschriebene Texte einer Schülerin / eines Schülers.'
    );

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


/**
 * Merkwörter-Block für die Übungs-Prompts.
 * Gibt der KI die Wörter mit, die dieser Lerner wiederholt falsch schreibt –
 * damit Übungen genau daran arbeiten statt an erfundenen Beispielen.
 * Ist die Liste leer, steht hier nichts: dann gibt es schlicht keine.
 */
function merkwoerterBlock(session) {
  const words = wordRegister.wordsForPrompt(session.wordRegister, 12);
  if (!words.length) return '';
  return (
    'MERKWÖRTER DIESES LERNERS (wiederholt falsch geschrieben):\n' +
    words.map((w) => '  - ' + w).join('\n') +
    '\nBaue nach Möglichkeit einige davon in die Übung ein – das sind die echten ' +
    'Stolpersteine. Erfinde KEINE weiteren dazu.\n\n'
  );
}

/**
 * Block für die Grading-Prompts, wenn das Frontend zusätzlich Kandidaten aus
 * der on-device Stift-Erkennung (Google ML Kit Digital Ink, nur nativ)
 * mitschickt. Die liest die tatsächliche Schreibbewegung statt nur das
 * fertige Bild – ein starker, aber kein unfehlbarer Hinweis. Leer, wenn das
 * Frontend nichts mitschickt (Web, oder Modell noch nicht heruntergeladen).
 */
function inkCandidatesBlock(inkCandidates) {
  const list = Array.isArray(inkCandidates) ? inkCandidates.filter(Boolean) : [];
  if (!list.length) return '';
  return (
    'STIFT-ERKENNUNG (on-device, liest die Schreibbewegung statt nur das Bild – ' +
    'zuverlässiger als reines Bild-Lesen, aber nicht unfehlbar):\n' +
    list.map((c, i) => `  ${i + 1}. "${c}"`).join('\n') +
    '\nNutze das als starken Hinweis beim Lesen der Handschrift. Zeigt das Bild ' +
    'eindeutig etwas anderes, vertraue dem Bild – bei unklaren/mehrdeutigen ' +
    'Buchstaben bevorzuge diese Kandidaten.\n\n'
  );
}

/**
 * Bild-Katalog für den Prompt – nur eingebunden, wenn das gewählte Format
 * tatsächlich Bilder braucht (picture_sentence), damit andere Formate
 * keinen unnötig langen Prompt bekommen.
 */
function pictureLibraryBlock(exType) {
  if (exType !== 'picture_sentence') return '';
  return (
    'VERFÜGBARE BILD-KONZEPTE (nur diese Schlüssel dürfen verwendet werden):\n' +
    imageLibrary.keysForPrompt() +
    '\n\n'
  );
}

/**
 * Prüft die von der KI gelieferten "pictures" gegen den echten Katalog und
 * löst gültige Schlüssel zur Anzeige auf (Emoji-Platzhalter oder – sobald
 * vorhanden – echtes Bild). Ungültige, erfundene Schlüssel fallen raus,
 * statt kaputt beim Kind anzukommen.
 */
function resolvePictures(pictures) {
  if (!Array.isArray(pictures)) return [];
  return pictures
    .map((p) => imageLibrary.resolve(p?.key))
    .filter(Boolean);
}

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

  // ── ÜBUNGSTYP-WAHL ──────────────────────────────────
  // Aus der Registry: nur Formate, die zum Fokus-Feature passen, und unter
  // denen möglichst das am längsten nicht genutzte (Abwechslung).
  const chosen = exercises.pickType(focusFeature, session.recentTypes || []);
  const exType = chosen.id;

  // ── ÜBUNGSBANK ZUERST ────────────────────────────────
  // Geprüftes Material aus echten Lehrwerken schlägt eine KI-Neuerzeugung.
  // Nur für eingeloggte Schüler (Bank-Historie braucht eine studentId).
  if (isDbEnabled && ctx.persistent) {
    const bankRow = await exerciseBank.pickFromBank(supabase, {
      format: exType,
      focusFeature,
      grade: session.profile?.grade,
      studentId: ctx.studentId,
    });
    if (bankRow) {
      const exercise = exerciseBank.toExercise(bankRow, focusFeature);
      await exerciseBank.markUsed(supabase, ctx.studentId, bankRow.id);
      session.lastFocusFeature = focusFeature;
      session.lastExercise = exercise;
      session.recentTypes = [exType, ...(session.recentTypes || [])].slice(0, 8);
      session.cardProgress = null;
      console.log(`[next-exercise] Bank-Treffer – Typ: ${exType}, Fokus: "${focusFeature}", Quelle: ${bankRow.source_file || '-'}`);
      await ctx.save();
      return res.json(exercise);
    }
  }

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
    merkwoerterBlock(session) +
    pictureLibraryBlock(exType) +
    chosen.spec + '\n\n' +
    exercises.globalRules(exType) +
    'ANTWORT AUSSCHLIESSLICH ALS JSON:\n' +
    '{\n' +
    `  "type": "${exType}",\n` +
    '  "focusFeature": "<exakter Name aus Feature-Table>",\n' +
    '  "topic": "<kurzes, klares Thema dieser Übung für die Überschrift, z.B. \\"Kommasetzung\\", ' +
    '\\"ie/i-Schreibung\\", \\"das/dass\\", \\"Doppelkonsonanten\\">",\n' +
    '  "instruction": "<altersgerechte Aufgabenstellung OHNE Antworten zu verraten>",\n' +
    '  "tips": ["<Achtsamkeit 1: worauf das Kind achten soll>", "<Achtsamkeit 2>", "<Achtsamkeit 3>"],\n' +
    '  "displayText": "<das Material, das angezeigt wird – siehe Formatbeschreibung; LEER bei audio_dictation und flashcards>",\n' +
    '  "correctText": "<die vollständig korrekte Lösung – LEER bei flashcards>",\n' +
    (chosen.answerMode === 'cards'
      ? '  "cards": [ { "sentence": "Satz mit ___", "hint": "Umschreibung des gesuchten Wortes", ' +
        '"answer": "Wort", "full": "vollständiger richtiger Satz", "explanation": "kurze Erklärung" } ],\n'
      : '') +
    (exType === 'picture_sentence'
      ? '  "pictures": [ { "key": "<Schlüssel exakt aus lib/imagelibrary.js>" } ],\n'
      : '') +
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
    // Karten-Formate: ohne brauchbare Karten ist die Übung wertlos
    if (chosen.answerMode === 'cards') {
      const cards = Array.isArray(exercise.cards) ? exercise.cards : [];
      exercise.cards = cards
        .filter((c) => c && c.sentence && c.answer)
        .map((c) => ({
          sentence: String(c.sentence),
          hint: String(c.hint || ''),
          answer: String(c.answer),
          full: String(c.full || String(c.sentence).replace('___', c.answer)),
          explanation: String(c.explanation || ''),
        }));
      if (!exercise.cards.length) {
        console.error('[next-exercise] Karten-Format ohne Karten – KI-Antwort unbrauchbar.');
        return res.status(502).json({ error: 'Übung konnte nicht erstellt werden.' });
      }
      exercise.displayText = '';
      exercise.correctText = '';
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
    // Bilder: nur echte Katalog-Schlüssel durchlassen, erfundene rauswerfen.
    // Ohne mindestens ein gültiges Bild ist die Übung unbrauchbar.
    if (exType === 'picture_sentence') {
      exercise.pictures = resolvePictures(exercise.pictures);
      if (!exercise.pictures.length) {
        console.error('[next-exercise] picture_sentence ohne gültige Bild-Schlüssel – KI-Antwort unbrauchbar.');
        return res.status(502).json({ error: 'Übung konnte nicht erstellt werden.' });
      }
    }

    session.lastFocusFeature = focusFeature;
    session.lastExercise = exercise;
    // Format merken, damit sich die Auswahl beim nächsten Mal abwechselt
    session.recentTypes = [exType, ...(session.recentTypes || [])].slice(0, 8);
    session.cardProgress = null;   // neue Übung → Kartenfortschritt zurücksetzen

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



/**
 * Schließt eine Karten-Übung ab.
 * Die einzelnen Karten wurden bereits über /api/card/check bewertet; hier
 * werden die gesammelten Ergebnisse zu Lernstand, Punkten, Streak und
 * Wortliste verrechnet – nach denselben Regeln wie bei den anderen Formaten.
 */
async function finishCardExercise(req, res, ctx, session, last) {
  const results = (session.cardProgress?.results || []).filter(Boolean);
  const total = last.cards.length;
  const correct = results.filter((r) => r.correct).length;
  const ratio = total > 0 ? correct / total : 0;

  // Lernstand: jede Karte ist eine Gelegenheit für das Fokus-Feature
  applyGradingResults(
    session.featureTable,
    [{ feature: last.focusFeature || session.lastFocusFeature, total, correct }],
    last.type
  );
  session.featureTable.sort((a, b) => a.mastery - b.mastery);

  // Wortliste aus allen Karten-Korrekturen speisen
  const allCorrections = results.flatMap((r) => r.corrections || []);
  session.wordRegister = wordRegister.recordMistakes(session.wordRegister, allCorrections);

  // Gamification – gleiche Formeln wie sonst
  const points = Math.round(ratio * 10);
  session.points += points;
  session.coins = (session.coins || 0) + points; // eigene Insel-Währung, wächst parallel
  session.exercisesCompleted += 1;
  session.level = Math.floor(session.points / 100) + 1;
  session.lastExercisePerformance = ratio >= 0.8 ? 'good' : ratio >= 0.5 ? 'medium' : 'poor';
  session.exerciseHistory.push({
    feature: session.lastFocusFeature,
    score: Math.round(ratio * 100),
  });
  store.bumpStreak(session);
  session.cardProgress = null;

  await ctx.save();
  if (ctx.persistent) {
    await ctx.log({
      feature: session.lastFocusFeature,
      exerciseType: last.type,
      topic: last.topic || null,
      score: Math.round(ratio * 100),
    });
  }

  console.log(`[submit] Kartenübung: ${correct}/${total} richtig`);

  return res.json({
    points,
    totalPoints: session.points,
    coins: points,
    totalCoins: session.coins || 0,
    level: session.level,
    pointsToNextLevel: session.level * 100 - session.points,
    levelProgressPercent: ((session.points % 100) / 100) * 100,
    exercisesCompleted: session.exercisesCompleted,
    streakDays: session.streakDays || 0,
    bestStreak: session.bestStreak || 0,
    summary_good: correct === total
      ? ['Alle Karten richtig – stark!']
      : [`${correct} von ${total} Karten richtig.`],
    word_corrections: allCorrections,
    explanation: last.explanation || '',
  });
}

// ─────────────────────────────────────────────────────────────
// ROUTE: /api/card/check – EINE Flashcard prüfen
//   Karten-Übungen laufen Karte für Karte: schreiben → prüfen → weiterwischen.
//   Hier wird nur die einzelne Karte bewertet und das Ergebnis gesammelt;
//   abgeschlossen wird die Übung erst über /api/submit-exercise.
// ─────────────────────────────────────────────────────────────
app.post('/api/card/check', async (req, res) => {
  const { sessionId, image, cardIndex, inkCandidates } = req.body || {};
  if ((!sessionId && !req.student) || !image) {
    return res.status(400).json({ error: 'Anmeldung/sessionId und image erforderlich.' });
  }

  const ctx = await resolveState(req, sessionId);
  const session = ctx.state;
  const last = session.lastExercise;
  const cards = last?.cards;
  if (!Array.isArray(cards) || !cards.length) {
    return res.status(409).json({ error: 'Keine Kartenübung aktiv.', code: 'NO_ACTIVE_EXERCISE' });
  }
  const idx = Math.max(0, Math.min(cards.length - 1, Number(cardIndex) || 0));
  const card = cards[idx];

  const gradeText =
    buildContextBlock(session.profile) + '\n' +
    'Auf dem Bild siehst du einen handgeschriebenen Satz einer Schülerin / eines Schülers.\n\n' +
    `ERWARTETER SATZ: "${card.full}"\n` +
    `GESUCHTES WORT IN DER LÜCKE: "${card.answer}"\n\n` +
    inkCandidatesBlock(inkCandidates) +
    'AUFGABE:\n' +
    '1) Lies die Handschrift sorgfältig, WORT FÜR WORT gegen den erwarteten Satz.\n' +
    '2) Wurde der Satz vollständig und richtig geschrieben? Kleine Abweichungen in der\n' +
    '   Handschrift sind egal – es zählt die Rechtschreibung.\n' +
    '3) Liste JEDES falsch geschriebene Wort einzeln auf, mit kindgerechter Erklärung,\n' +
    '   die die passende FRESCH-Strategie nennt und am Wort vorführt.\n' +
    '4) Ist ein einzelner Buchstabe eines Wortes wirklich nicht sicher zu erkennen (nicht ' +
    '   nur unordentlich, sondern mehrdeutig – z.B. e/i nicht unterscheidbar), zähle dieses ' +
    '   Wort NICHT als Fehler und NICHT als richtig. Trag es stattdessen in "unsure_words" ' +
    '   ein. Rate NICHT zugunsten von richtig oder falsch – ehrliche Unsicherheit ist besser ' +
    '   als eine falsche Zählung, die dem Lernstand schadet.\n\n' +
    'ANTWORT AUSSCHLIESSLICH ALS JSON:\n' +
    '{\n' +
    '  "correct": true|false,\n' +
    '  "read_text": "<was du gelesen hast>",\n' +
    '  "gap_correct": true|false,\n' +
    '  "praise": "<ein kurzer, motivierender Satz>",\n' +
    '  "word_corrections": [ { "wrong":"...", "correct":"...", ' +
    '"fresch_strategy":"Schwingen|Verlängern|Ableiten|Merken", "explanation":"...", "feature":"..." } ],\n' +
    '  "unsure_words": ["<kurz: welches Wort, was war unklar>"]\n' +
    '}';

  try {
    const lang = getLanguage(session.profile?.language);
    const { text } = await callClaude({
      label: 'card',
      systemPrompt:
        lang.graderRole +
        ' Du antwortest IMMER ausschließlich mit gültigem JSON (kein Markdown-Block, kein Erklärtext).',
      userContent: [toImageBlock(image), { type: 'text', text: gradeText }],
      maxTokens: 1200,
    });

    let g;
    try {
      g = parseJsonResponse(text);
    } catch (e) {
      console.error('[card] JSON-Parse-Fehler. Roh-Antwort:\n' + text);
      return res.status(502).json({ error: 'Antwort konnte nicht gelesen werden.' });
    }

    // Ergebnis sammeln (für den Abschluss der Übung)
    const progress = session.cardProgress || { results: [] };
    progress.results[idx] = {
      correct: Boolean(g.correct),
      corrections: Array.isArray(g.word_corrections) ? g.word_corrections : [],
    };
    session.cardProgress = progress;
    await ctx.save();

    const done = progress.results.filter(Boolean).length;
    return res.json({
      correct: Boolean(g.correct),
      praise: g.praise || '',
      expected: card.full,
      explanation: card.explanation || '',
      word_corrections: progress.results[idx].corrections,
      unsure_words: Array.isArray(g.unsure_words) ? g.unsure_words : [],
      cardIndex: idx,
      cardsTotal: cards.length,
      cardsDone: done,
      isLast: idx >= cards.length - 1,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Karte konnte nicht geprüft werden.' });
  }
});

// ─────────────────────────────────────────────────────────────
// ROUTE 3: /api/submit-exercise
//   Vision-basiertes Grading: KI liest die handschriftliche Antwort,
//   vergleicht sie mit der erwarteten Lösung, gradet Features
//   und erkennt neue Fehlermuster.
// ─────────────────────────────────────────────────────────────
app.post('/api/submit-exercise', async (req, res) => {
  const { sessionId, image, inkCandidates } = req.body || {};
  if (!sessionId && !req.student) {
    return res.status(400).json({ error: 'Anmeldung/sessionId erforderlich.' });
  }

  const ctx = await resolveState(req, sessionId);
  const session = ctx.state;
  const last = session.lastExercise;
  const isCardExercise = Array.isArray(last?.cards) && last.cards.length > 0;

  if (!last || (!last.correctText && !isCardExercise)) {
    return res.status(409).json({
      error: 'Keine aktive Übung gefunden.',
      code: 'NO_ACTIVE_EXERCISE',
    });
  }
  // Karten-Übungen wurden Karte für Karte geprüft – hier wird nur abgeschlossen.
  if (isCardExercise) {
    return finishCardExercise(req, res, ctx, session, last);
  }
  if (!image) {
    return res.status(400).json({ error: 'image erforderlich.' });
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
    `- Erwartete korrekte Lösung: "${last.correctText}"\n` +
    (Array.isArray(last.pictures) && last.pictures.length
      ? `- Gezeigte Bilder (in dieser Reihenfolge, je ein Satz dazu erwartet): ` +
        `${last.pictures.map((p) => p.label).join(', ')}\n`
      : '') +
    '\n' +
    inkCandidatesBlock(inkCandidates) +
    'BEKANNTE FEATURES (Memory):\n' +
    JSON.stringify(session.featureTable, null, 2) +
    '\n\n' +
    (() => {
      const words = wordRegister.wordsForPrompt(session.wordRegister, 15);
      if (!words.length) return '';
      return 'MERKWÖRTER DIESES LERNERS (schreibt er wiederholt falsch):\n' +
        words.map((w) => '  - ' + w).join('\n') + '\n' +
        'Melde unter "register_correct", welche dieser Wörter in der Lösung vorkamen ' +
        'UND richtig geschrieben waren. Nur tatsächlich vorhandene Wörter – nichts erfinden.\n\n';
    })() +
    'AUFGABE:\n' +
    '1) Lies die Handschrift sorgfältig, WORT FÜR WORT gegen die erwartete Lösung – ' +
    '   du kennst den erwarteten Text bereits, nutze ihn zum Abgleichen statt frei zu raten.\n' +
    '2) Vergleiche mit der erwarteten Lösung.\n' +
    '3) ZÄHLE für das Fokus-Feature: wie viele GELEGENHEITEN gab es in dieser Übung\n' +
    '   (alle Stellen, an denen die Regel greift) und wie viele davon waren KORREKT?\n' +
    '4) Zähle genauso für ANDERE bekannte Features, falls in der Lösung beobachtbar.\n' +
    '5) Erkenne NEUE Fehlermuster (spezifisch, trainierbar, keine vagen Stil-Probleme).\n' +
    '6) Liste JEDES FALSCH GESCHRIEBENE WORT einzeln als word_corrections (siehe unten).\n' +
    '7) Ist ein Wort wirklich mehrdeutig geschrieben (nicht nur unordentlich, sondern z.B.\n' +
    '   e/i oder n/m nicht unterscheidbar), zähle es NICHT als Fehler und NICHT als richtig –\n' +
    '   weder in word_corrections noch in den Zählungen unter "results". Trag es stattdessen\n' +
    '   in "unsure_words" ein. Eine falsche Zählung schadet dem Lernstand mehr als eine ehrliche\n' +
    '   Lücke – rate nicht zugunsten von richtig oder falsch.\n' +
    '8) Gib einen overall_score 0-100 für diese Übung.\n\n' +
    'WICHTIG word_corrections: Jedes Wort, das die Schülerin/der Schüler falsch geschrieben hat, ' +
    'kommt als eigener Eintrag in die Liste – mit der korrekten Schreibweise und einer kindgerechten, ' +
    'altersangemessenen Erklärung. Die Erklärung MUSS die FRESCH-Strategie (Schwingen / Verlängern / ' +
    'Ableiten / Merken) explizit nennen und am konkreten Wort vorführen. ' +
    'Beispiel-Erklärung (Verlängern): „Verlängere das Wort: Berg → die Berge. Du hörst das g am Ende, ' +
    'also schreibst du Berg mit g, nicht mit k." KEINE generischen Tipps. ' +
    'Wenn alles richtig war: leere Liste.\n\n' +
    'WICHTIG: Schätze KEINE Prozentwerte und keinen Lernstand. Wir brauchen nur deine\n' +
    'Zählungen (total = Gelegenheiten, correct = davon richtig). Den Lernstand berechnet\n' +
    'unser System daraus selbst – so bleibt er nachvollziehbar und vergleichbar.\n' +
    'Es gilt immer: correct <= total.\n\n' +
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
    '    { "feature":"<exakter Name aus Memory>", "total":N, "correct":N, "feedback":"..." }\n' +
    '  ],\n' +
    '  "new_features_detected": [\n' +
    '    { "name":"...", "reason":"...", "evidence":"...", "total":N, "correct":N }\n' +
    '  ],\n' +
    '  "register_correct": ["Merkwörter, die diesmal RICHTIG geschrieben waren"],\n' +
    '  "unsure_words": ["<kurz: welches Wort, was war unklar>"]\n' +
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
    applyGradingResults(session.featureTable, aiGrading.results, last.type);
    addedFeatures = addNewFeatures(session.featureTable, aiGrading.new_features_detected);
    session.featureTable.sort((a, b) => a.mastery - b.mastery);

    // Wortliste pflegen: falsch geschriebene Wörter zählen, richtig geschriebene
    // Merkwörter gutschreiben. Aufgenommen wird nur, was WIEDERHOLT falsch war.
    session.wordRegister = wordRegister.recordMistakes(
      session.wordRegister, aiGrading.word_corrections);
    session.wordRegister = wordRegister.recordCorrect(
      session.wordRegister, aiGrading.register_correct);
    const merk = wordRegister.activeWords(session.wordRegister);
    if (merk.length) {
      console.log(`[submit] Merkwörter (${merk.length}): ` +
        merk.slice(0, 6).map((e) => `${e.word}(${e.wrong}x)`).join(', '));
    }

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
  session.coins = (session.coins || 0) + points; // eigene Insel-Währung, wächst parallel
  session.exercisesCompleted += 1;
  session.level = Math.floor(session.points / 100) + 1;
  session.lastExercisePerformance = ratio >= 0.8 ? 'good' : ratio >= 0.5 ? 'medium' : 'poor';
  session.exerciseHistory.push({
    feature: session.lastFocusFeature,
    score: Math.round(ratio * 100),
  });
  // Streak: heute geübt → Tag zählen (nur bei eingeloggten Schülern persistent)
  store.bumpStreak(session);

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
    coins: points,
    totalCoins: session.coins || 0,
    level: session.level,
    pointsToNextLevel,
    levelProgressPercent,
    exercisesCompleted: session.exercisesCompleted,
    streakDays: session.streakDays || 0,
    bestStreak: session.bestStreak || 0,
    summary_good: aiGrading?.summary_good || [],
    word_corrections: Array.isArray(aiGrading?.word_corrections) ? aiGrading.word_corrections : [],
    unsure_words: Array.isArray(aiGrading?.unsure_words) ? aiGrading.unsure_words : [],
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
