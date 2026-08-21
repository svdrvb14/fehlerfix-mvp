/**
 * Übungsbank – vorgefertigte Übungen aus echtem Lehrmaterial.
 *
 * Statt jede Übung von der KI neu erfinden zu lassen, schaut /api/next-exercise
 * zuerst hier nach: gibt es zum gewählten Format + Fokus-Feature + Klassenstufe
 * eine geprüfte, vom Schüler noch nicht gesehene Übung aus der Bank? Wenn ja,
 * wird sie unverändert im FehlerFix-Format ausgegeben – kein KI-Aufruf nötig,
 * und die Qualität ist die des Originalmaterials.
 *
 * Fällt nichts Passendes, generiert next-exercise wie bisher mit der KI.
 */

function normTag(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // Akzente weg für robusteres Matching
    .replace(/\s+/g, ' ');
}

/**
 * Sucht eine passende, ungesehene Bank-Übung.
 * @param {object} supabase - Supabase-Client
 * @param {object} opts - { format, focusFeature, grade, studentId }
 * @returns {object|null} rohe DB-Zeile oder null
 */
async function pickFromBank(supabase, { format, focusFeature, grade, studentId }) {
  if (!supabase || !studentId) return null; // Gäste (kein Login) haben keine Bank-Historie – überspringen

  const tag = normTag(focusFeature);
  if (!tag) return null;

  let query = supabase
    .from('exercise_bank')
    .select('*')
    .eq('format', format)
    .eq('reviewed', true)
    .contains('feature_tags', [tag])
    .limit(50);

  if (grade) {
    // Klassenstufe ±1 – Material ist oft für eine Spanne geeignet.
    // and(...) gruppiert gte+lte, sonst würde or() sie unabhängig auswerten.
    query = query.or(`grade.is.null,and(grade.gte.${grade - 1},grade.lte.${grade + 1})`);
  }

  const { data, error } = await query;
  if (error || !Array.isArray(data) || !data.length) return null;

  const { data: used } = await supabase
    .from('exercise_bank_usage')
    .select('exercise_id')
    .eq('student_id', studentId);
  const usedIds = new Set((used || []).map((r) => r.exercise_id));

  const candidates = data.filter((row) => !usedIds.has(row.id));
  if (!candidates.length) return null;

  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** Merkt eine Bank-Übung als von diesem Schüler benutzt (keine Wiederholung). */
async function markUsed(supabase, studentId, exerciseId) {
  if (!supabase || !studentId || !exerciseId) return;
  await supabase
    .from('exercise_bank_usage')
    .upsert({ student_id: studentId, exercise_id: exerciseId }, { onConflict: 'student_id,exercise_id' });
}

/** Wandelt eine DB-Zeile in das Übungs-JSON um, das das Frontend erwartet. */
function toExercise(row, focusFeature) {
  return {
    type: row.format,
    focusFeature,
    topic: row.topic || focusFeature,
    instruction: row.instruction || '',
    tips: Array.isArray(row.tips) ? row.tips : [],
    displayText: row.display_text || '',
    correctText: row.correct_text || '',
    cards: Array.isArray(row.cards) ? row.cards : undefined,
    explanation: row.explanation || '',
    source: 'bank', // fürs Logging – next-exercise ersetzt es nicht, loggt es nur mit
  };
}

module.exports = { pickFromBank, markUsed, toExercise, normTag };
