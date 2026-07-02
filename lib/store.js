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
  };
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

module.exports = {
  loadStudentState,
  saveStudentState,
  saveStudentProfile,
  logExercise,
};
