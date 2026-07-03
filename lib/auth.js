/**
 * Auth-Logik für FehlerFix.
 *
 * Zwei Schüler-Login-Wege:
 *   1. E-Mail + Passwort (ältere Schüler)
 *   2. Klassencode + Name + PIN (jüngere Schüler)
 *
 * Sessions: signiertes JWT in einem httpOnly-Cookie. Der Server ist alleiniger
 * Gatekeeper (spricht mit Supabase über service_role).
 *
 * Passwörter und PINs werden mit bcrypt gehasht – nie im Klartext gespeichert.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase, isDbEnabled } = require('./db');

const COOKIE_NAME = 'ff_session';
const TOKEN_TTL = '30d';
const SECRET = process.env.SESSION_SECRET || 'dev-insecure-secret-change-me';

// ─── Helpers ─────────────────────────────────────────────────
function hash(plain) {
  return bcrypt.hash(String(plain), 10);
}
function verifyHash(plain, hashed) {
  if (!hashed) return Promise.resolve(false);
  return bcrypt.compare(String(plain), hashed);
}

function signToken(user, role = 'student') {
  return jwt.sign(
    { sub: user.id, role, method: user.auth_method || null },
    SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 Tage
    path: '/',
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

// Erzeugt einen gut lesbaren Klassencode (ohne verwechselbare Zeichen)
function generateClassCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ohne I,O,0,1
  let code = '';
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

// ─── Middleware ──────────────────────────────────────────────
// Liest das Session-Cookie, hängt je nach Rolle req.student ODER req.teacher an.
async function attachUser(req, res, next) {
  req.student = null;
  req.teacher = null;
  if (!isDbEnabled) return next();
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, SECRET);
    if (payload.role === 'teacher') {
      const { data } = await supabase
        .from('teachers')
        .select('id, email, display_name')
        .eq('id', payload.sub)
        .single();
      if (data) req.teacher = data;
    } else {
      const { data } = await supabase
        .from('students')
        .select('id, auth_method, email, display_name, class_id, profile, parent_email')
        .eq('id', payload.sub)
        .single();
      if (data) req.student = data;
    }
  } catch (e) {
    // ungültiges/abgelaufenes Token → einfach niemand
  }
  next();
}

function requireStudent(req, res, next) {
  if (!req.student) {
    return res.status(401).json({ error: 'Nicht angemeldet.', code: 'NOT_AUTHENTICATED' });
  }
  next();
}

function requireTeacher(req, res, next) {
  if (!req.teacher) {
    return res.status(401).json({ error: 'Nicht als Lehrkraft angemeldet.', code: 'NOT_TEACHER' });
  }
  next();
}

// ─── Registrierung / Login ───────────────────────────────────

/** E-Mail-Registrierung (ältere Schüler) */
async function registerEmail({ email, password, profile }) {
  email = String(email || '').trim().toLowerCase();
  if (!email || !/.+@.+\..+/.test(email)) throw httpError(400, 'Bitte eine gültige E-Mail eingeben.');
  if (!password || String(password).length < 6) throw httpError(400, 'Passwort muss mindestens 6 Zeichen haben.');

  const existing = await supabase.from('students').select('id').eq('email', email).maybeSingle();
  if (existing.data) throw httpError(409, 'Diese E-Mail ist schon registriert. Bitte einloggen.');

  const password_hash = await hash(password);
  const { data, error } = await supabase
    .from('students')
    .insert({ auth_method: 'email', email, password_hash, profile: profile || {} })
    .select('id, auth_method, email, display_name, class_id, profile')
    .single();
  if (error) throw httpError(500, 'Registrierung fehlgeschlagen.');
  await ensureState(data.id);
  return data;
}

/** E-Mail-Login */
async function loginEmail({ email, password }) {
  email = String(email || '').trim().toLowerCase();
  const { data } = await supabase
    .from('students')
    .select('id, auth_method, email, display_name, class_id, profile, password_hash')
    .eq('email', email)
    .maybeSingle();
  if (!data || !(await verifyHash(password, data.password_hash))) {
    throw httpError(401, 'E-Mail oder Passwort stimmt nicht.');
  }
  await touchLogin(data.id);
  delete data.password_hash;
  return data;
}

/** Klassencode-Registrierung (jüngere Schüler): Name + PIN in einer Klasse */
async function registerClassCode({ classCode, displayName, pin }) {
  const cls = await findClass(classCode);
  displayName = String(displayName || '').trim();
  if (!displayName) throw httpError(400, 'Bitte einen Namen eingeben.');
  if (!/^\d{4,6}$/.test(String(pin || ''))) throw httpError(400, 'PIN muss 4–6 Ziffern haben.');

  // Name in dieser Klasse schon vergeben?
  const dupe = await supabase
    .from('students')
    .select('id')
    .eq('class_id', cls.id)
    .eq('auth_method', 'class_code')
    .ilike('display_name', displayName)
    .maybeSingle();
  if (dupe.data) throw httpError(409, 'Diesen Namen gibt es in der Klasse schon. Wähle einen anderen.');

  const pin_hash = await hash(pin);
  // Profil aus der Klasse vorbelegen
  const profile = {
    grade: cls.grade || null,
    schoolType: cls.school_type || null,
    state: cls.state || null,
    language: cls.language || 'de',
  };
  const { data, error } = await supabase
    .from('students')
    .insert({
      auth_method: 'class_code',
      class_id: cls.id,
      display_name: displayName,
      pin_hash,
      profile,
    })
    .select('id, auth_method, email, display_name, class_id, profile')
    .single();
  if (error) throw httpError(500, 'Registrierung fehlgeschlagen.');
  await ensureState(data.id);
  return data;
}

/** Klassencode-Login: Klassencode + Name + PIN */
async function loginClassCode({ classCode, displayName, pin }) {
  const cls = await findClass(classCode);
  const { data } = await supabase
    .from('students')
    .select('id, auth_method, email, display_name, class_id, profile, pin_hash')
    .eq('class_id', cls.id)
    .eq('auth_method', 'class_code')
    .ilike('display_name', String(displayName || '').trim())
    .maybeSingle();
  if (!data || !(await verifyHash(pin, data.pin_hash))) {
    throw httpError(401, 'Name oder PIN stimmt nicht.');
  }
  await touchLogin(data.id);
  delete data.pin_hash;
  return data;
}

/** E-Mail-Schüler tritt später einer Klasse bei (Seitenmenü) */
async function joinClass(studentId, classCode) {
  const cls = await findClass(classCode);
  const { data, error } = await supabase
    .from('students')
    .update({ class_id: cls.id })
    .eq('id', studentId)
    .select('id, auth_method, email, display_name, class_id, profile')
    .single();
  if (error) throw httpError(500, 'Beitritt fehlgeschlagen.');
  return { student: data, className: cls.name };
}

// ─── LEHRER ──────────────────────────────────────────────────

/** Lehrer-Registrierung (E-Mail + Passwort) */
async function registerTeacher({ email, password, displayName }) {
  email = String(email || '').trim().toLowerCase();
  if (!email || !/.+@.+\..+/.test(email)) throw httpError(400, 'Bitte eine gültige E-Mail eingeben.');
  if (!password || String(password).length < 6) throw httpError(400, 'Passwort muss mindestens 6 Zeichen haben.');

  const existing = await supabase.from('teachers').select('id').eq('email', email).maybeSingle();
  if (existing.data) throw httpError(409, 'Diese E-Mail ist schon registriert. Bitte einloggen.');

  const password_hash = await hash(password);
  const { data, error } = await supabase
    .from('teachers')
    .insert({ email, password_hash, display_name: String(displayName || '').trim() || null })
    .select('id, email, display_name')
    .single();
  if (error) throw httpError(500, 'Registrierung fehlgeschlagen.');
  return data;
}

/** Lehrer-Login */
async function loginTeacher({ email, password }) {
  email = String(email || '').trim().toLowerCase();
  const { data } = await supabase
    .from('teachers')
    .select('id, email, display_name, password_hash')
    .eq('email', email)
    .maybeSingle();
  if (!data || !(await verifyHash(password, data.password_hash))) {
    throw httpError(401, 'E-Mail oder Passwort stimmt nicht.');
  }
  await supabase.from('teachers').update({ last_login: new Date().toISOString() }).eq('id', data.id);
  delete data.password_hash;
  return data;
}

/** Lehrer legt eine neue Klasse an → generiert einen eindeutigen Klassencode */
async function createClassForTeacher(teacherId, { name, state, schoolType, grade, language }) {
  // Eindeutigen Code finden (bei Kollision neu würfeln)
  let code;
  for (let i = 0; i < 8; i++) {
    code = generateClassCode();
    const clash = await supabase.from('classes').select('id').eq('class_code', code).maybeSingle();
    if (!clash.data) break;
  }
  const { data, error } = await supabase
    .from('classes')
    .insert({
      class_code: code,
      name: String(name || '').trim() || 'Meine Klasse',
      teacher_id: teacherId,
      state: state || null,
      school_type: schoolType || null,
      grade: grade || null,
      language: language || 'de',
    })
    .select('id, class_code, name, state, school_type, grade, language, created_at')
    .single();
  if (error) throw httpError(500, 'Klasse konnte nicht erstellt werden.');
  return data;
}

// ─── DB-Helfer ───────────────────────────────────────────────
async function findClass(classCode) {
  const code = String(classCode || '').trim().toUpperCase();
  if (!code) throw httpError(400, 'Bitte einen Klassencode eingeben.');
  const { data } = await supabase
    .from('classes')
    .select('id, class_code, name, state, school_type, grade, language')
    .eq('class_code', code)
    .maybeSingle();
  if (!data) throw httpError(404, 'Diesen Klassencode gibt es nicht.');
  return data;
}

async function ensureState(studentId) {
  await supabase.from('student_state').upsert(
    { student_id: studentId },
    { onConflict: 'student_id', ignoreDuplicates: true }
  );
}

async function touchLogin(studentId) {
  await supabase.from('students').update({ last_login: new Date().toISOString() }).eq('id', studentId);
}

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

module.exports = {
  COOKIE_NAME,
  attachUser,
  requireStudent,
  requireTeacher,
  signToken,
  setSessionCookie,
  clearSessionCookie,
  generateClassCode,
  registerEmail,
  loginEmail,
  registerClassCode,
  loginClassCode,
  joinClass,
  findClass,
  registerTeacher,
  loginTeacher,
  createClassForTeacher,
};
