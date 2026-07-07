/**
 * Persistenz-Schicht für den Schüler-State (Fehlerprofil + Fortschritt).
 *
 * Bildet die DB-Tabelle `student_state` auf das gleiche Objekt-Format ab,
 * das die Übungs-Routen bisher aus dem in-memory `sessions`-Objekt kannten:
 *   { profile, featureTable, level, points, exercisesCompleted,
 *     lastExercisePerformance, lastFocusFeature, lastExercise, exerciseHistory }
 *
 * So bleibt die Route-Logik nahezu unverändert – nur Laden/Speichern läuft
 * jetzt über die DB statt über RAM.
 */
const { supabase } = require('./db');

// DB-Row (snake_case) → Session-Objekt (camelCase)
function rowToState(row, profile) {
  return {
    profile: profile || null,
    featureTable: row?.feature_table || [],
    level: row?.level ?? 1,
    points: row?.points ?? 0,
    exercisesCompleted: row?.exercises_completed ?? 0,
    lastExercisePerformance: row?.last_exercise_performance || null,
    lastFocusFeature: row?.last_focus_feature || null,
    lastExercise: row?.last_exercise || null,
    exerciseHistory: row?.exercise_history || [],
    streakDays: row?.streak_days ?? 0,
    bestStreak: row?.best_streak ?? 0,
    lastPracticeDate: row?.last_practice_date || null,
  };
}

// Datum als 'YYYY-MM-DD' in Europa/Berlin (für Streak-Tagesgrenzen)
function berlinDateStr(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Aktualisiert den Streak nach einer Übung/einem Upload.
 * Mutiert das state-Objekt (streakDays, bestStreak, lastPracticeDate).
 */
function bumpStreak(state) {
  const today = berlinDateStr();
  const last = state.lastPracticeDate;
  if (last === today) {
    // heute schon geübt → keine Änderung
  } else {
    const yesterday = berlinDateStr(new Date(Date.now() - 24 * 60 * 60 * 1000));
    state.streakDays = last === yesterday ? (state.streakDays || 0) + 1 : 1;
    state.lastPracticeDate = today;
  }
  state.bestStreak = Math.max(state.bestStreak || 0, state.streakDays || 0);
}

/** Lädt (oder erzeugt) den State eines Schülers aus der DB. */
async function loadStudentState(studentId, profile) {
  const { data } = await supabase
    .from('student_state')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle();
  if (!data) {
    await supabase.from('student_state').insert({ student_id: studentId });
    return rowToState(null, profile);
  }
  return rowToState(data, profile);
}

/** Schreibt den kompletten State zurück in die DB. */
async function saveStudentState(studentId, state) {
  await supabase
    .from('student_state')
    .update({
      feature_table: state.featureTable || [],
      level: state.level ?? 1,
      points: state.points ?? 0,
      exercises_completed: state.exercisesCompleted ?? 0,
      last_exercise_performance: state.lastExercisePerformance || null,
      last_focus_feature: state.lastFocusFeature || null,
      last_exercise: state.lastExercise || null,
      exercise_history: (state.exerciseHistory || []).slice(-20),
      streak_days: state.streakDays ?? 0,
      best_streak: state.bestStreak ?? 0,
      last_practice_date: state.lastPracticeDate || null,
      updated_at: new Date().toISOString(),
    })
    .eq('student_id', studentId);
}

/** Speichert das Profil des Schülers (Bundesland/Klasse/Schulform/Sprache). */
async function saveStudentProfile(studentId, profile) {
  await supabase.from('students').update({ profile: profile || {} }).eq('id', studentId);
}

/** Append-only Log für Lehrer-Dashboard + Eltern-Report. */
async function logExercise(studentId, { feature, exerciseType, topic, score }) {
  await supabase.from('exercise_log').insert({
    student_id: studentId,
    feature: feature || null,
    exercise_type: exerciseType || null,
    topic: topic || null,
    score: typeof score === 'number' ? Math.round(score) : null,
  });
}

// ─── LEHRER-DASHBOARD ────────────────────────────────────────

/** Klassen einer Lehrkraft inkl. Schülerzahl. */
async function listTeacherClasses(teacherId) {
  const { data: classes } = await supabase
    .from('classes')
    .select('id, class_code, name, state, school_type, grade, created_at')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: true });
  const list = classes || [];
  // Schülerzahl pro Klasse
  for (const c of list) {
    const { count } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', c.id);
    c.studentCount = count || 0;
  }
  return list;
}

/** Prüft, dass die Klasse dieser Lehrkraft gehört (sonst null). */
async function getTeacherClass(teacherId, classId) {
  const { data } = await supabase
    .from('classes')
    .select('id, class_code, name, state, school_type, grade, teacher_id')
    .eq('id', classId)
    .maybeSingle();
  if (!data || data.teacher_id !== teacherId) return null;
  return data;
}

/** Schüler einer Klasse mit Fortschritts-Zusammenfassung. */
async function listClassStudents(classId) {
  const { data: students } = await supabase
    .from('students')
    .select('id, display_name, email, auth_method, created_at, last_login')
    .eq('class_id', classId)
    .order('display_name', { ascending: true });
  const list = students || [];
  for (const s of list) {
    const { data: st } = await supabase
      .from('student_state')
      .select('level, points, exercises_completed, feature_table, updated_at')
      .eq('student_id', s.id)
      .maybeSingle();
    s.level = st?.level ?? 1;
    s.points = st?.points ?? 0;
    s.exercisesCompleted = st?.exercises_completed ?? 0;
    s.lastActive = st?.updated_at || s.last_login || null;
    // Top-3 Schwächen (niedrigste mastery) fürs schnelle Lehrer-Bild
    const ft = Array.isArray(st?.feature_table) ? st.feature_table.slice() : [];
    ft.sort((a, b) => (a.mastery ?? 100) - (b.mastery ?? 100));
    s.topWeaknesses = ft.slice(0, 3).map((f) => ({ name: f.name, mastery: f.mastery }));
  }
  return list;
}

/** Vollständiges Fehlerprofil + Verlauf eines Schülers (nur für dessen Lehrkraft). */
async function getStudentDetail(studentId) {
  const { data: student } = await supabase
    .from('students')
    .select('id, display_name, email, auth_method, class_id, profile, created_at, last_login, parent_email')
    .eq('id', studentId)
    .maybeSingle();
  if (!student) return null;

  const { data: st } = await supabase
    .from('student_state')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle();

  const { data: log } = await supabase
    .from('exercise_log')
    .select('feature, exercise_type, topic, score, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(30);

  const featureTable = Array.isArray(st?.feature_table) ? st.feature_table.slice() : [];
  featureTable.sort((a, b) => (a.mastery ?? 100) - (b.mastery ?? 100));

  return {
    id: student.id,
    displayName: student.display_name,
    email: student.email,
    authMethod: student.auth_method,
    profile: student.profile || {},
    createdAt: student.created_at,
    lastLogin: student.last_login,
    level: st?.level ?? 1,
    points: st?.points ?? 0,
    exercisesCompleted: st?.exercises_completed ?? 0,
    errorProfile: featureTable, // die "unsichtbare" Feature-Table – für Lehrer sichtbar
    recentExercises: log || [],
  };
}

/** Gehört der Schüler zu einer Klasse dieser Lehrkraft? (Zugriffsschutz) */
async function studentBelongsToTeacher(studentId, teacherId) {
  const { data: student } = await supabase
    .from('students')
    .select('class_id')
    .eq('id', studentId)
    .maybeSingle();
  if (!student?.class_id) return false;
  const { data: cls } = await supabase
    .from('classes')
    .select('teacher_id')
    .eq('id', student.class_id)
    .maybeSingle();
  return cls?.teacher_id === teacherId;
}

/** TEMP QA: löscht ausschließlich Testdaten mit Marker "ClaudeQA". */
async function deleteClaudeQATestData() {
  const counts = {};
  const stud = await supabase.from('students').delete({ count: 'exact' })
    .or('display_name.ilike.ClaudeQA%,email.ilike.claudeqa.%@fehlerfix.test');
  counts.students = stud.count || 0;
  const cls = await supabase.from('classes').delete({ count: 'exact' }).ilike('name', 'ClaudeQA%');
  counts.classes = cls.count || 0;
  const teach = await supabase.from('teachers').delete({ count: 'exact' }).ilike('email', 'claudeqa.%@fehlerfix.test');
  counts.teachers = teach.count || 0;
  return counts;
}

/** Kurz-Infos zu einer Klasse (Name + Code) für die Menü-Anzeige. */
async function getClassBrief(classId) {
  if (!classId) return null;
  const { data } = await supabase
    .from('classes')
    .select('id, name, class_code')
    .eq('id', classId)
    .maybeSingle();
  return data || null;
}

module.exports = {
  loadStudentState,
  saveStudentState,
  saveStudentProfile,
  logExercise,
  getClassBrief,
  bumpStreak,
  deleteClaudeQATestData,
  listTeacherClasses,
  getTeacherClass,
  listClassStudents,
  getStudentDetail,
  studentBelongsToTeacher,
};
