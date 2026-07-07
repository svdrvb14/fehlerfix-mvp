/* ─────────────────────────────────────────────────────────
 * FehlerFix – Frontend
 * Konzept: Motorisch fördernde Lern-App.
 *   - 3 Onboarding-Texte werden handschriftlich auf Canvas geschrieben
 *   - Übungen sind Lückentext oder Fehlertext – ebenfalls handschriftlich
 *     auf einem zweiten Canvas abgeschrieben
 *   - Keine Tastatur-Eingaben, keine Multiple Choice
 * ───────────────────────────────────────────────────────── */

const SESSION_ID = (() => {
  let id = localStorage.getItem('fehlerfix-session');
  if (!id) {
    id = 'sess-' + Math.random().toString(36).slice(2) + '-' + Date.now();
    localStorage.setItem('fehlerfix-session', id);
  }
  return id;
})();

// iOS: Verhindere systemweit das Markieren/Kontextmenü von Texten,
// wenn der Stift über Aufgabenstellungen oder Buttons wandert.
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('selectstart', (e) => {
  // Inputs/Textareas erlauben (falls später welche dazu kommen)
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
  e.preventDefault();
});

// ─────────────────────────────────────────────────────────
// Top-Navigation: Brand → Home, Anleitung/Über uns/Impressum → Modals
// ─────────────────────────────────────────────────────────
const MODAL_CONTENT = {
  anleitung: {
    title: 'So funktioniert FehlerFix',
    html: `
      <h3>1. Erzähl uns kurz von dir</h3>
      <p>Du gibst deine Klassenstufe und Schulform an. So passen wir die Aufgaben genau auf dein Niveau an.</p>

      <h3>2. Schreib uns drei kurze Texte</h3>
      <p>Drei freie Texte zu verschiedenen Themen, ganz handschriftlich auf dem Notizbuch im Bildschirm.</p>

      <h3>3. Die KI baut dein Übungsprogramm</h3>
      <p>Wir lesen deine Schrift, finden Muster, wo es noch unsicher ist, und stellen daraus ein persönliches Übungsprogramm zusammen.</p>

      <h3>4. Üben – mit Stift, nicht mit Tastatur</h3>
      <p>Jede Übung schreibst du handschriftlich ab. Es gibt drei Arten:</p>
      <ul>
        <li><strong>Lückentext</strong> – Text abschreiben und Lücken füllen</li>
        <li><strong>Fehlertext</strong> – Fehler finden und richtig abschreiben</li>
        <li><strong>Audio-Diktat</strong> – langsam vorgelesener Text mitschreiben</li>
      </ul>

      <h3>5. Verstehen statt nur korrigieren</h3>
      <p>Nach jeder Übung siehst du, was gut war und was wir nochmal üben. Du bekommst nicht nur die richtige Lösung, sondern auch die kindgerechte Erklärung dahinter.</p>
    `,
  },
  ueber: {
    title: 'Über FehlerFix',
    html: `
      <h3>Schreib. Versteh. Verbessere.</h3>
      <p>FehlerFix ist eine adaptive Lern-App für Rechtschreibung. Unser USP: Wir korrigieren nicht nur Fehler – wir erklären, <em>warum</em> ein Wort so geschrieben wird, und wir generieren personalisierte Übungen, die genau zu den Mustern passen, die du im echten Schreiben zeigst.</p>

      <h3>Warum handschriftlich?</h3>
      <p>Studien zeigen: Wer mit Stift schreibt, lernt Rechtschreibung tiefer als am Keyboard. Außerdem fördert es die Feinmotorik. Deshalb ist FehlerFix bewusst <strong>keine Multiple-Choice-App</strong>, sondern eine motorisch fördernde Lern-App.</p>

      <h3>Wie wir das machen</h3>
      <p>Im Hintergrund läuft ein adaptives Modell mit einer wachsenden „Feature-Table" für jeden Lerner – jede Übung schärft das Bild davon, wo du stehst. Die KI von Anthropic Claude liest deine Handschrift und erkennt nicht nur Tippfehler, sondern echte Muster im Rechtschreibverhalten.</p>

      <h3>Status</h3>
      <p>FehlerFix befindet sich aktuell als MVP im Test. Wir entwickeln das Projekt im Rahmen eines Schulwettbewerbs (Deutschlandfinale) weiter.</p>
    `,
  },
  impressum: {
    title: 'Impressum',
    html: `
      <p>Angaben gemäß § 5 TMG / DSG-VO</p>

      <h3>Anbieter</h3>
      <p>
        Business@School Team Leibnizschule<br>
        – Schülerprojekt FehlerFix –<br>
        Kontakt: contact.temfehlerfix@gmail.com
      </p>

      <h3>Hinweis</h3>
      <p>Diese Anwendung ist ein nicht-kommerzielles Schulprojekt (MVP). Sie wird ausschließlich zu Lern- und Demonstrationszwecken im Rahmen eines Wettbewerbs betrieben.</p>

      <h3>Datenverarbeitung</h3>
      <p>Während der Nutzung werden handgeschriebene Texte an die Anthropic API (Claude) übertragen, um sie auszuwerten. Es findet keine dauerhafte Speicherung der Texte oder Bilder statt – Sessions werden nur im Arbeitsspeicher des Servers gehalten und beim Neustart gelöscht.</p>

      <h3>Haftungsausschluss</h3>
      <p>Die Inhalte und Bewertungen werden durch eine KI generiert und können fehlerhaft sein. Es besteht kein Anspruch auf Korrektheit der Korrekturen oder Erklärungen.</p>

      <div class="impressum-block">
        Bei einem späteren produktiven Einsatz werden die Pflichtangaben (vollständige Anschrift, V.i.S.d.P., Datenschutzerklärung) entsprechend ergänzt.
      </div>
    `,
  },
};

function openModal(key) {
  const cfg = MODAL_CONTENT[key];
  if (!cfg) return;
  document.getElementById('modal-title').textContent = cfg.title;
  document.getElementById('modal-body').innerHTML = cfg.html;
  const modal = document.getElementById('modal');
  modal.hidden = false;
  modal.scrollTop = 0;
  // Body-Scroll sperren, solange Modal offen ist
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  document.getElementById('modal').hidden = true;
  document.body.style.overflow = '';
}

// Alle Buttons mit data-modal öffnen das passende Modal
document.querySelectorAll('[data-modal]').forEach((btn) => {
  btn.addEventListener('click', () => openModal(btn.dataset.modal));
});
// Schließen via X-Button oder Backdrop
document.querySelectorAll('[data-close-modal]').forEach((el) => {
  el.addEventListener('click', closeModal);
});
// Escape-Taste schließt
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !document.getElementById('modal').hidden) closeModal();
});

// Brand "FehlerFix" klick → Startseite (Welcome)
document.getElementById('nav-home').addEventListener('click', () => {
  // Falls TTS noch läuft (Audio-Diktat), stoppen
  if (typeof tts !== 'undefined' && tts) tts.stop();
  showScreen('welcome');
});

// Themen-Pool zur Datenerhebung (Onboarding).
// Jedes Thema hat einen "levels"-Tag, damit wir altersangemessen filtern:
//   "primary"   = Grundschule (Klasse 1-4)
//   "lower"     = Sekundarstufe I (Klasse 5-10)
//   "upper"     = Sekundarstufe II / Oberstufe (Klasse 11-13)
// Themen können auch mehrere Levels haben.
const TOPIC_POOL = [
  // ─── für alle Stufen geeignet ──────────────────────
  { title: 'Mein Tagesablauf', desc: 'Erzähle, was du an einem normalen Tag machst, vom Aufstehen bis zum Schlafengehen.', levels: ['primary', 'lower', 'upper'] },
  { title: 'Mein Lieblingsbuch', desc: 'Welches Buch magst du am liebsten? Worum geht es und was gefällt dir daran?', levels: ['primary', 'lower', 'upper'] },
  { title: 'Mein Wochenende', desc: 'Was machst du am Wochenende am liebsten? Erzähle von einem schönen Wochenende.', levels: ['primary', 'lower', 'upper'] },
  { title: 'Mein schönster Urlaub', desc: 'Wo warst du im Urlaub? Was hast du erlebt und was hat dir am besten gefallen?', levels: ['primary', 'lower', 'upper'] },
  { title: 'Mein Lieblingshobby', desc: 'Was machst du in deiner Freizeit am liebsten? Erzähle ausführlich davon.', levels: ['primary', 'lower', 'upper'] },
  { title: 'Mein Lieblingsort', desc: 'Wo bist du am liebsten? Beschreibe diesen Ort und warum du ihn magst.', levels: ['primary', 'lower', 'upper'] },

  // ─── Grundschule (primary) ─────────────────────────
  { title: 'Mein Lieblingstier', desc: 'Welches ist dein Lieblingstier? Wie sieht es aus und warum magst du es so sehr?', levels: ['primary'] },
  { title: 'Mein Lieblingsessen', desc: 'Was isst du am liebsten? Wie schmeckt es und wann gibt es das bei dir?', levels: ['primary', 'lower'] },
  { title: 'Mein Lieblingsspiel', desc: 'Welches Spiel spielst du am liebsten? Wie geht es und warum macht es Spaß?', levels: ['primary'] },
  { title: 'Mein Zimmer', desc: 'Wie sieht dein Zimmer aus? Was ist alles drin und was machst du dort gerne?', levels: ['primary', 'lower'] },
  { title: 'Wenn ich Superkräfte hätte', desc: 'Welche Superkraft hättest du gerne? Was würdest du damit machen?', levels: ['primary'] },
  { title: 'Meine Familie', desc: 'Beschreibe deine Familie. Wer gehört dazu und was macht ihr gerne zusammen?', levels: ['primary', 'lower'] },
  { title: 'Meine beste Freundin oder mein bester Freund', desc: 'Mit wem verbringst du am liebsten Zeit? Was macht ihr zusammen?', levels: ['primary', 'lower'] },
  { title: 'Mein letzter Geburtstag', desc: 'Wie war dein letzter Geburtstag? Was hast du gemacht und mit wem gefeiert?', levels: ['primary', 'lower'] },

  // ─── Sekundarstufe I (lower) ──────────────────────
  { title: 'Mein Lieblingsfach', desc: 'Welches Fach magst du in der Schule am meisten? Erkläre, warum.', levels: ['lower', 'upper'] },
  { title: 'Was ich später werden möchte', desc: 'Welchen Beruf wünschst du dir? Warum gerade diesen?', levels: ['lower', 'upper'] },
  { title: 'Mein perfekter Tag', desc: 'Wie würde dein perfekter Tag aussehen, von morgens bis abends?', levels: ['lower'] },
  { title: 'Ein Tag im Sommer', desc: 'Wie verbringst du gerne einen Sommertag? Was machst du, mit wem und wo?', levels: ['primary', 'lower'] },
  { title: 'Ein Tag im Winter', desc: 'Was machst du am liebsten im Winter? Erzähle von einem schönen Wintertag.', levels: ['primary', 'lower'] },
  { title: 'Mein größter Wunsch', desc: 'Was wünschst du dir am meisten? Warum ist dir das wichtig?', levels: ['lower'] },
  { title: 'Mein Lieblingsfilm oder meine Lieblingsserie', desc: 'Welcher Film oder welche Serie gefällt dir besonders? Worum geht es und was macht es spannend?', levels: ['lower', 'upper'] },
  { title: 'Ein peinlicher Moment', desc: 'Erzähl von einer peinlichen oder lustigen Situation, die dir passiert ist.', levels: ['lower'] },
  { title: 'Mein größter Erfolg', desc: 'Worauf bist du besonders stolz? Beschreibe, was du erreicht hast und wie es war.', levels: ['lower', 'upper'] },
  { title: 'Was ich an der Schule ändern würde', desc: 'Was würdest du an deiner Schule anders machen, wenn du es entscheiden könntest? Warum?', levels: ['lower', 'upper'] },

  // ─── Oberstufe / Sek II (upper) ───────────────────
  { title: 'Eine wichtige Entscheidung', desc: 'Beschreibe eine Entscheidung, die dich geprägt hat. Wie kam es dazu und was hat sie verändert?', levels: ['upper'] },
  { title: 'Ein Buch, das mich zum Nachdenken brachte', desc: 'Welches Buch hat dich nachhaltig beeindruckt? Worum geht es und welche Gedanken hat es ausgelöst?', levels: ['upper'] },
  { title: 'Was bedeutet Freundschaft für mich', desc: 'Was macht eine echte Freundschaft aus? Beschreibe deine Sicht und nenne konkrete Beispiele.', levels: ['upper'] },
  { title: 'Meine Pläne nach der Schule', desc: 'Wie stellst du dir die Zeit nach dem Abschluss vor? Welche Wege ziehst du in Betracht und warum?', levels: ['upper'] },
  { title: 'Ein gesellschaftliches Thema, das mich beschäftigt', desc: 'Welches aktuelle Thema findest du wichtig? Erläutere deine Meinung und begründe sie.', levels: ['upper'] },
  { title: 'Ein Erlebnis, das mich verändert hat', desc: 'Beschreibe ein Erlebnis, das deine Sichtweise auf etwas verändert hat.', levels: ['upper'] },
  { title: 'Mein Verhältnis zu sozialen Medien', desc: 'Wie nutzt du Social Media? Welche Chancen und Risiken siehst du?', levels: ['upper'] },
  { title: 'Was mich an meiner Region begeistert oder stört', desc: 'Beschreibe deine Stadt oder Region. Was findest du gut, was würdest du verändern?', levels: ['lower', 'upper'] },
];

/**
 * Wandelt Klassenstufe in Bildungs-Level um, das mit den Topic-Tags matcht.
 */
function gradeToLevel(grade) {
  const g = Number(grade);
  if (!g || g < 1) return 'lower'; // Fallback
  if (g <= 4) return 'primary';
  if (g <= 10) return 'lower';
  return 'upper';
}

/**
 * Zieht n eindeutige Themen aus dem Pool, gefiltert nach Bildungs-Level.
 */
function pickRandomTopics(n = 3, grade = null) {
  const level = gradeToLevel(grade);
  let candidates = TOPIC_POOL.filter((t) => t.levels && t.levels.includes(level));
  // Sicherheitsnetz: wenn das Filtern zu wenig liefert (sollte nicht passieren), nimm alle
  if (candidates.length < n) candidates = TOPIC_POOL.slice();
  // Fisher-Yates-Shuffle
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, n);
}

const LOADING_MESSAGES = [
  'Lese deine Handschrift...',
  'Schaue mir jedes Wort an...',
  'Suche nach typischen Fehlern...',
  'Erkenne deine Stärken...',
  'Baue dein Übungsprogramm...',
  'Das kann ein paar Minuten dauern – nicht weggehen!',
  'Noch ein bisschen Geduld...',
];

const state = {
  currentTopicIndex: 0,
  capturedImages: [],
  selectedTopics: pickRandomTopics(3),
  profile: { grade: null, schoolType: null, state: null }, // state = Bundesland
  currentExercise: null,
  retryAction: null,
};

// ─────────────────────────────────────────────────────────
// Profile-Screen: Bundesland → Klassenstufe → Schulform
//   Bundesländer + Schulformen werden vom Server geladen
//   (single source of truth: lib/curriculum-data/_states-meta.js)
// ─────────────────────────────────────────────────────────

// Cache, damit wir bei jedem Re-Open nicht neu laden müssen
const profileOptionsCache = {
  states: null,                      // [{ value, label }]
  schoolFormsByState: {},             // { state: { schoolForms, primaryUpTo } }
};

async function loadStates() {
  if (profileOptionsCache.states) return profileOptionsCache.states;
  try {
    const res = await fetch('/api/profile/states');
    const data = await res.json();
    profileOptionsCache.states = data.states || [];
  } catch (e) {
    console.error('[profile] States laden fehlgeschlagen, Fallback minimal.', e);
    // Notfall-Fallback (sollte nicht passieren wenn Server läuft)
    profileOptionsCache.states = [
      { value: 'BW', label: 'Baden-Württemberg' },
      { value: 'BY', label: 'Bayern' },
      { value: 'BE', label: 'Berlin' },
      { value: 'BB', label: 'Brandenburg' },
      { value: 'HB', label: 'Bremen' },
      { value: 'HH', label: 'Hamburg' },
      { value: 'HE', label: 'Hessen' },
      { value: 'MV', label: 'Mecklenburg-Vorpommern' },
      { value: 'NI', label: 'Niedersachsen' },
      { value: 'NW', label: 'Nordrhein-Westfalen' },
      { value: 'RP', label: 'Rheinland-Pfalz' },
      { value: 'SL', label: 'Saarland' },
      { value: 'SN', label: 'Sachsen' },
      { value: 'ST', label: 'Sachsen-Anhalt' },
      { value: 'SH', label: 'Schleswig-Holstein' },
      { value: 'TH', label: 'Thüringen' },
    ];
  }
  return profileOptionsCache.states;
}

async function loadSchoolForms(stateCode) {
  if (profileOptionsCache.schoolFormsByState[stateCode]) {
    return profileOptionsCache.schoolFormsByState[stateCode];
  }
  try {
    const res = await fetch('/api/profile/school-forms?state=' + encodeURIComponent(stateCode));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    profileOptionsCache.schoolFormsByState[stateCode] = data;
    return data;
  } catch (e) {
    console.error('[profile] Schulformen für', stateCode, 'fehlgeschlagen.', e);
    return { schoolForms: [], primaryUpTo: 4 };
  }
}

function isElementary(grade) {
  const primary = profileOptionsCache.schoolFormsByState[state.profile.state]?.primaryUpTo || 4;
  return grade && grade >= 1 && grade <= primary;
}

async function renderProfileScreen() {
  const stateWrap = document.getElementById('state-buttons');
  const gradeWrap = document.getElementById('grade-buttons');

  // 1) Bundesland zuerst
  const states = await loadStates();
  stateWrap.innerHTML = '';
  states.forEach((s) => {
    const b = document.createElement('button');
    b.className = 'choice-btn';
    b.textContent = s.label;
    b.dataset.value = s.value;
    b.addEventListener('click', async () => {
      stateWrap.querySelectorAll('.choice-btn').forEach((x) => x.classList.remove('selected'));
      b.classList.add('selected');
      state.profile.state = s.value;
      // Bei Bundesland-Wechsel: Schulform-Auswahl ggf. invalidieren
      const opts = await loadSchoolForms(s.value);
      const stillValid = opts.schoolForms.some((sf) => sf.value === state.profile.schoolType);
      if (!stillValid) state.profile.schoolType = null;
      renderSchoolForms();
      refreshSchoolTypeField();
      updateProfileContinue();
    });
    stateWrap.appendChild(b);
  });

  // 2) Klassenstufen-Buttons (1-13)
  gradeWrap.innerHTML = '';
  for (let i = 1; i <= 13; i++) {
    const b = document.createElement('button');
    b.className = 'choice-btn';
    b.textContent = i;
    b.dataset.grade = String(i);
    b.addEventListener('click', () => {
      gradeWrap.querySelectorAll('.choice-btn').forEach((x) => x.classList.remove('selected'));
      b.classList.add('selected');
      state.profile.grade = i;
      if (isElementary(i)) {
        state.profile.schoolType = 'Grundschule';
      } else if (state.profile.schoolType === 'Grundschule') {
        state.profile.schoolType = null;
      }
      refreshSchoolTypeField();
      updateProfileContinue();
    });
    gradeWrap.appendChild(b);
  }

  // 3) Schulformen werden dynamisch nach Bundesland-Auswahl gefüllt
  renderSchoolForms();

  // Auswahl wiederherstellen
  restoreSelection(stateWrap, 'value', state.profile.state);
  restoreSelection(gradeWrap, 'grade', state.profile.grade);

  // Wenn Bundesland schon gewählt war: Schulformen laden + auswählen
  if (state.profile.state) {
    await loadSchoolForms(state.profile.state);
    renderSchoolForms();
    restoreSelection(document.getElementById('school-buttons'), 'value', state.profile.schoolType);
  }

  refreshSchoolTypeField();
  updateProfileContinue();
}

function renderSchoolForms() {
  const schoolWrap = document.getElementById('school-buttons');
  schoolWrap.innerHTML = '';
  if (!state.profile.state) {
    schoolWrap.innerHTML =
      '<div class="profile-hint-soft">Wähle erst dein Bundesland aus.</div>';
    return;
  }
  const opts = profileOptionsCache.schoolFormsByState[state.profile.state];
  if (!opts) {
    schoolWrap.innerHTML = '<div class="profile-hint-soft">Lade Schulformen…</div>';
    return;
  }
  opts.schoolForms.forEach((s) => {
    const b = document.createElement('button');
    b.className = 'choice-btn';
    b.textContent = s.label;
    b.dataset.value = s.value;
    b.addEventListener('click', () => {
      schoolWrap.querySelectorAll('.choice-btn').forEach((x) => x.classList.remove('selected'));
      b.classList.add('selected');
      state.profile.schoolType = s.value;
      updateProfileContinue();
    });
    schoolWrap.appendChild(b);
  });
  // Vorherige Auswahl wiederherstellen (falls noch gültig)
  if (state.profile.schoolType) {
    restoreSelection(schoolWrap, 'value', state.profile.schoolType);
  }
}

function restoreSelection(wrap, attr, value) {
  if (!value) return;
  const sel = wrap.querySelector(`[data-${attr}="${value}"]`);
  if (sel) sel.classList.add('selected');
}

// Bei Klasse 1-4 (oder 1-6 in BE/BB) wird das Schulform-Feld ausgeblendet (auto = Grundschule)
function refreshSchoolTypeField() {
  const field = document.getElementById('schoolType-field');
  const hint = document.getElementById('schoolType-hint');
  const schoolWrap = document.getElementById('school-buttons');
  if (!field) return;
  const auto = isElementary(state.profile.grade);
  schoolWrap.hidden = auto;
  hint.hidden = !auto;
  if (auto) {
    const primary = profileOptionsCache.schoolFormsByState[state.profile.state]?.primaryUpTo || 4;
    hint.textContent = `Klasse 1–${primary} ist automatisch Grundschule.`;
  } else if (!schoolWrap.hidden) {
    restoreSelection(schoolWrap, 'value', state.profile.schoolType);
  }
}

function updateProfileContinue() {
  const profileComplete =
    !!state.profile.state && !!state.profile.grade && !!state.profile.schoolType;
  document.getElementById('btn-profile-continue').disabled = !profileComplete;
}

document.getElementById('btn-profile-continue').addEventListener('click', () => {
  state.selectedTopics = pickRandomTopics(3, state.profile.grade);
  state.currentTopicIndex = 0;
  state.capturedImages = [];
  loadTopic(0);
  showScreen('write');
});

// ─────────────────────────────────────────────────────────
// Screen-Wechsel
// ─────────────────────────────────────────────────────────
function showScreen(id) {
  // Bei Screen-Wechsel: laufende Sprachausgabe stoppen (sonst spricht's weiter im Hintergrund)
  if (typeof tts !== 'undefined' && tts && tts.stop && id !== 'exercise') {
    tts.stop();
  }
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  const el = document.getElementById('screen-' + id);
  if (el) {
    void el.offsetWidth;
    el.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function showError(message, retryAction) {
  document.getElementById('error-message').textContent = message || 'Versuch es nochmal.';
  state.retryAction = retryAction || (() => showScreen('welcome'));
  showScreen('error');
}

// ─────────────────────────────────────────────────────────
// Modulare Canvas-Engine (für Onboarding UND Übungen)
// ─────────────────────────────────────────────────────────
function createCanvasEngine({ canvasEl, placeholderEl, penBtn, eraserBtn }) {
  const ctx = canvasEl.getContext('2d');
  let drawing = false;
  let lastX = 0;
  let lastY = 0;
  let tool = 'pen';
  let drawn = false;

  function setDrawn(v) {
    drawn = v;
    if (placeholderEl) placeholderEl.classList.toggle('hidden', v);
  }

  let resizePending = false;
  function scheduleResize() {
    if (resizePending) return;
    resizePending = true;
    requestAnimationFrame(() => {
      resizePending = false;
      resize();
    });
  }

  function resize() {
    const rect = canvasEl.getBoundingClientRect();
    // Nicht resizen, wenn das Canvas (noch) nicht sichtbar ist
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const newWidth = Math.round(rect.width * dpr);
    const newHeight = Math.round(rect.height * dpr);

    // Wenn sich nichts geändert hat: nichts tun (verhindert Resize-Loops)
    if (canvasEl.width === newWidth && canvasEl.height === newHeight) return;

    // Aktuellen Inhalt synchron in ein Temp-Canvas retten (Alpha bleibt erhalten)
    let temp = null;
    if (canvasEl.width > 0 && canvasEl.height > 0) {
      temp = document.createElement('canvas');
      temp.width = canvasEl.width;
      temp.height = canvasEl.height;
      temp.getContext('2d').drawImage(canvasEl, 0, 0);
    }

    canvasEl.width = newWidth;
    canvasEl.height = newHeight;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over';
    // Transparent lassen: damit CSS-Schullinien durchscheinen
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Vorherigen Inhalt synchron auf die neue Größe zeichnen
    if (temp) {
      ctx.drawImage(temp, 0, 0, rect.width, rect.height);
    }
  }

  // ResizeObserver: reagiert robust auf jede Größenänderung des Canvas-Elements,
  // egal ob durch Window-Resize, clamp(), Orientation Change oder Screen-Wechsel.
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => scheduleResize());
    ro.observe(canvasEl);
  }
  window.addEventListener('resize', scheduleResize);
  window.addEventListener('orientationchange', scheduleResize);

  function pointerPos(e) {
    const rect = canvasEl.getBoundingClientRect();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: x - rect.left, y: y - rect.top };
  }

  function applyStrokeStyle() {
    if (tool === 'eraser') {
      // destination-out löscht Pixel statt sie weiß zu übermalen →
      // die CSS-Schullinien darunter werden wieder sichtbar
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = 24;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 2.5;
    }
  }

  function startDraw(e) {
    e.preventDefault();
    drawing = true;
    const { x, y } = pointerPos(e);
    lastX = x;
    lastY = y;
    applyStrokeStyle();
    if (tool === 'eraser') {
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, 1.25, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1a2e';
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    setDrawn(true);
  }

  function moveDraw(e) {
    if (!drawing) return;
    e.preventDefault();
    const { x, y } = pointerPos(e);
    applyStrokeStyle();
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    lastX = x;
    lastY = y;
  }

  function endDraw(e) {
    if (drawing && e && e.preventDefault) e.preventDefault();
    drawing = false;
  }

  // Klassische Maus + Touch (Apple Pencil zählt auf iPad als Touch).
  // Kein Pointer-Capture, keine Palm Rejection – wenn der Handballen drauf liegt,
  // kann es mal einen Punkt geben, aber das Schreiben bricht nicht ab.
  canvasEl.addEventListener('mousedown', startDraw);
  canvasEl.addEventListener('mousemove', moveDraw);
  canvasEl.addEventListener('mouseup', endDraw);
  canvasEl.addEventListener('mouseleave', endDraw);
  canvasEl.addEventListener('touchstart', startDraw, { passive: false });
  canvasEl.addEventListener('touchmove', moveDraw, { passive: false });
  canvasEl.addEventListener('touchend', endDraw, { passive: false });
  canvasEl.addEventListener('touchcancel', endDraw, { passive: false });

  // iOS: Kontextmenü (Kopieren / Alles auswählen) auf dem Canvas unterbinden
  canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());
  canvasEl.addEventListener('selectstart', (e) => e.preventDefault());

  if (penBtn)
    penBtn.addEventListener('click', () => {
      tool = 'pen';
      penBtn.classList.add('active');
      if (eraserBtn) eraserBtn.classList.remove('active');
    });
  if (eraserBtn)
    eraserBtn.addEventListener('click', () => {
      tool = 'eraser';
      eraserBtn.classList.add('active');
      if (penBtn) penBtn.classList.remove('active');
    });

  function clear() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    ctx.restore();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over';
    setDrawn(false);
  }

  // Beim Export ans Vision-Grading: weißer Hintergrund unterlegen, OHNE die CSS-Schullinien.
  // Damit „sieht" die KI nur den Strich des Kindes, nicht die Heftlinien.
  function toJpeg(quality = 0.85) {
    const off = document.createElement('canvas');
    off.width = canvasEl.width;
    off.height = canvasEl.height;
    const oc = off.getContext('2d');
    oc.fillStyle = '#ffffff';
    oc.fillRect(0, 0, off.width, off.height);
    oc.drawImage(canvasEl, 0, 0);
    return off.toDataURL('image/jpeg', quality);
  }

  return {
    resize,
    clear,
    hasDrawn: () => drawn,
    toJpeg,
    canvasEl,
  };
}

// ─────────────────────────────────────────────────────────
// TTS-Abstraktion (für Audio-Diktate)
//
// Aktuell: Web Speech API (kostenlos, offline, gute deutsche Stimmen
// auf iPad/Mac built-in).
// Später austauschbar gegen Qwen-TTS o.ä. – einfach createBrowserTTS()
// durch createQwenTTS() ersetzen, das Interface bleibt:
//   .speak(text)
//   .pause()  /  .resume()
//   .stop()
//   .on('start' | 'pause' | 'resume' | 'end' | 'error', cb)
// ─────────────────────────────────────────────────────────
function createBrowserTTS({ lang = 'de-DE', rate = 0.55, pitch = 1.0 } = {}) {
  const listeners = {};
  const emit = (event, payload) => (listeners[event] || []).forEach((cb) => cb(payload));
  let utterance = null;
  let preferredVoice = null;
  let onEndOnce = null; // exklusiver Callback für den nächsten end-Event (für Satz-Sequenz)

  function pickVoice() {
    if (preferredVoice) return preferredVoice;
    const voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    // Bevorzugt: weibliche deutsche Stimme (Anna/Petra/Helena), sonst irgendeine deutsche
    const candidates = voices.filter((v) => /^de/i.test(v.lang));
    const named = candidates.find((v) =>
      /(anna|petra|helena|katja|german)/i.test(v.name)
    );
    preferredVoice = named || candidates[0] || null;
    return preferredVoice;
  }

  // Voices werden async geladen → vorbereiten
  if (window.speechSynthesis) {
    speechSynthesis.onvoiceschanged = () => {
      preferredVoice = null; // neu picken
      pickVoice();
    };
    pickVoice();
  }

  return {
    isSupported: () => 'speechSynthesis' in window,

    speak(text) {
      if (!('speechSynthesis' in window)) {
        emit('error', new Error('Sprachausgabe wird hier nicht unterstützt.'));
        return;
      }
      try {
        speechSynthesis.cancel();
        utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = rate;
        utterance.pitch = pitch;
        const v = pickVoice();
        if (v) utterance.voice = v;
        utterance.onstart = () => emit('start');
        utterance.onpause = () => emit('pause');
        utterance.onresume = () => emit('resume');
        utterance.onend = () => {
          const cb = onEndOnce;
          onEndOnce = null;
          emit('end');
          if (cb) cb();
        };
        utterance.onerror = (e) => emit('error', e);
        speechSynthesis.speak(utterance);
      } catch (err) {
        emit('error', err);
      }
    },

    pause() {
      if ('speechSynthesis' in window) speechSynthesis.pause();
    },

    resume() {
      if ('speechSynthesis' in window) speechSynthesis.resume();
    },

    stop() {
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      utterance = null;
      onEndOnce = null;
    },

    isSpeaking: () =>
      'speechSynthesis' in window && speechSynthesis.speaking && !speechSynthesis.paused,
    isPaused: () => 'speechSynthesis' in window && speechSynthesis.paused,

    on(event, cb) {
      (listeners[event] = listeners[event] || []).push(cb);
    },

    // Exklusiver Einmal-Callback für den nächsten end-Event (für Satz-Sequenz)
    speakThen(text, cb) {
      onEndOnce = cb;
      this.speak(text);
    },

    setRate(newRate) {
      rate = newRate;
    },
  };
}

// Single Instance fürs gesamte Frontend
const tts = createBrowserTTS({ lang: 'de-DE', rate: 0.7 });

// ─────────────────────────────────────────────────────────
// Bild runterskalieren vor Upload
// ─────────────────────────────────────────────────────────
function downscaleImage(dataUrl, maxWidth = 1200, quality = 0.78) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = img.width > maxWidth ? maxWidth / img.width : 1;
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const c = off.getContext('2d');
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      c.drawImage(img, 0, 0, w, h);
      resolve(off.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// ─────────────────────────────────────────────────────────
// Screen 0: Welcome → Schreiben
// ─────────────────────────────────────────────────────────
document.getElementById('btn-start').addEventListener('click', () => {
  // Eingeloggte Schüler mit vollständigem Profil (z.B. aus Klassencode) überspringen
  // den Profil-Screen und gehen direkt zum Schreiben.
  const p = state.profile || {};
  const complete = p.grade && p.schoolType && p.state;
  if (authState.user && authState.user.role === 'student' && complete) {
    state.selectedTopics = pickRandomTopics(3, p.grade);
    state.currentTopicIndex = 0;
    state.capturedImages = [];
    loadTopic(0);
    showScreen('write');
    return;
  }
  // Sonst: Profil-Screen (Bundesland + Klassenstufe + Schulform)
  renderProfileScreen();
  showScreen('profile');
});

// ─────────────────────────────────────────────────────────
// Screen 1: Onboarding – Texte schreiben
// ─────────────────────────────────────────────────────────
const writeEngine = createCanvasEngine({
  canvasEl: document.getElementById('draw-canvas'),
  placeholderEl: document.getElementById('canvas-placeholder'),
  penBtn: document.getElementById('tool-pen'),
  eraserBtn: document.getElementById('tool-eraser'),
});

document.getElementById('btn-clear').addEventListener('click', () => writeEngine.clear());
document.getElementById('btn-cancel').addEventListener('click', () => {
  if (confirm('Wirklich abbrechen? Dein bisheriger Fortschritt geht verloren.')) {
    state.capturedImages = [];
    state.currentTopicIndex = 0;
    showScreen('welcome');
  }
});

function loadTopic(idx) {
  const topics = state.selectedTopics;
  const topic = topics[idx];
  document.getElementById('task-title').textContent = topic.title;
  document.getElementById('task-desc').textContent = topic.desc;
  document.getElementById('text-step-label').textContent = `Text ${idx + 1} von ${topics.length}`;
  const dots = document.querySelectorAll('#text-dots .dot');
  dots.forEach((d, i) => {
    d.classList.remove('active', 'done');
    if (i < idx) d.classList.add('done');
    else if (i === idx) d.classList.add('active');
  });
  document.getElementById('btn-next-text').textContent =
    idx === topics.length - 1 ? 'Fertig – Analyse starten →' : 'Weiter →';
  setTimeout(() => {
    writeEngine.resize();
    writeEngine.clear();
  }, 30);
}

document.getElementById('btn-next-text').addEventListener('click', () => {
  if (!writeEngine.hasDrawn()) {
    alert('Bitte schreib zuerst etwas in das Notizbuch.');
    return;
  }
  state.capturedImages.push(writeEngine.toJpeg(0.85));
  if (state.currentTopicIndex < state.selectedTopics.length - 1) {
    state.currentTopicIndex += 1;
    loadTopic(state.currentTopicIndex);
  } else {
    runAnalysis();
  }
});

// Resize-Trigger für Onboarding-Canvas wenn Screen aktiv
new MutationObserver(() => {
  if (document.getElementById('screen-write').classList.contains('active')) {
    setTimeout(() => writeEngine.resize(), 30);
  }
}).observe(document.getElementById('screen-write'), {
  attributes: true,
  attributeFilter: ['class'],
});

// ─────────────────────────────────────────────────────────
// Screen 2: Loading & Analyse
// ─────────────────────────────────────────────────────────
let loadingInterval = null;
// Setzt Titel + Untertext des Loading-Screens je nach Phase
function setLoadingText(title, sub) {
  const titleEl = document.getElementById('loading-title');
  const subEl = document.getElementById('loading-status');
  if (titleEl) titleEl.textContent = title;
  if (subEl && sub != null) subEl.textContent = sub;
}
function startLoadingRotation() {
  let i = 0;
  document.getElementById('loading-status').textContent = LOADING_MESSAGES[0];
  loadingInterval = setInterval(() => {
    i = (i + 1) % LOADING_MESSAGES.length;
    document.getElementById('loading-status').textContent = LOADING_MESSAGES[i];
  }, 1500);
}
function stopLoadingRotation() {
  if (loadingInterval) clearInterval(loadingInterval);
  loadingInterval = null;
}

async function runAnalysis() {
  showScreen('loading');
  setLoadingText('FehlerFix analysiert deine Texte...', 'Bereite deine Texte vor...');
  try {
    // Kleinere Bilder = kleinerer Body = robuster über WLAN/iPad-Hotspots
    const small = [];
    for (const img of state.capturedImages) {
      small.push(await downscaleImage(img, 1000, 0.72));
    }
    const kb = Math.round(small.reduce((s, d) => s + d.length * 0.75, 0) / 1024);
    console.log(`[analyze] Sende ~${kb} KB an Server (${small.length} Bilder)`);

    startLoadingRotation();
    const controller = new AbortController();
    // Claude antwortet meist in 20-60s, großzügig timeout für Spitzenlasten
    const timer = setTimeout(() => controller.abort(), 600000); // 10 min
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: SESSION_ID,
        images: small,
        profile: state.profile,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Server-Fehler (HTTP ${res.status})`);
    }
    stopLoadingRotation();
    showScreen('ready');
  } catch (err) {
    stopLoadingRotation();
    console.error('[analyze] Fehler:', err);
    showError(friendlyFetchError(err, 'der Analyse'), runAnalysis);
  }
}

/**
 * Wandelt Fetch-Fehler in eine kindgerechte Erklärung um.
 * Safari sagt z.B. "Load failed" – das soll der User nicht sehen.
 */
function friendlyFetchError(err, phase = 'der Anfrage') {
  if (!err) return 'Etwas ist schiefgegangen. Versuch es nochmal.';
  if (err.name === 'AbortError') {
    return `Bei ${phase} hat das zu lange gedauert. Versuch es nochmal.`;
  }
  const msg = String(err.message || '').toLowerCase();
  if (
    msg.includes('load failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('connection')
  ) {
    return (
      'Die Verbindung zum Server ist abgebrochen. ' +
      'Prüfe, ob dein Mac noch wach ist (nicht im Ruhezustand), und ob du im selben WLAN bist. ' +
      'Dann versuch es nochmal.'
    );
  }
  return err.message || 'Unbekannter Fehler. Versuch es nochmal.';
}

/**
 * Prüft eine Server-Antwort auf "Session verloren"-Codes (z.B. nach Server-Neustart).
 * Wenn ja: führt das Kind freundlich zurück zum Start statt in eine Retry-Sackgasse.
 * Gibt true zurück, wenn der Fall behandelt wurde.
 */
function handleSessionLost(body) {
  if (!body || (body.code !== 'NO_ANALYSIS' && body.code !== 'NO_ACTIVE_EXERCISE')) {
    return false;
  }
  // Zähler zurücksetzen, damit der nächste Durchlauf sauber bei 1 startet
  localStorage.removeItem('ff-ex-num');
  localStorage.removeItem('ff-level');
  state.currentExercise = null;
  showError(
    'Deine Sitzung ist abgelaufen (der Server wurde zwischendurch neu gestartet). ' +
      'Kein Problem – schreib einfach deine drei Texte neu, dann geht es weiter.',
    () => showScreen('welcome')
  );
  return true;
}

// ─────────────────────────────────────────────────────────
// Screen 3: Ready → Erste Übung
// ─────────────────────────────────────────────────────────
document.getElementById('btn-start-exercises').addEventListener('click', loadNextExercise);

// ─────────────────────────────────────────────────────────
// Screen 4: Übung – Aufgabe oben, Canvas unten
// ─────────────────────────────────────────────────────────
let exerciseEngine = null;

function ensureExerciseEngine() {
  if (exerciseEngine) return exerciseEngine;
  exerciseEngine = createCanvasEngine({
    canvasEl: document.getElementById('ex-canvas'),
    placeholderEl: document.getElementById('ex-canvas-placeholder'),
    penBtn: document.getElementById('ex-tool-pen'),
    eraserBtn: document.getElementById('ex-tool-eraser'),
  });
  document.getElementById('ex-btn-clear').addEventListener('click', () => {
    exerciseEngine.clear();
    document.getElementById('btn-check').disabled = true;
  });
  // Polling: sobald irgendwas gezeichnet wurde, Check-Button aktivieren
  setInterval(() => {
    const btn = document.getElementById('btn-check');
    if (
      document.getElementById('screen-exercise').classList.contains('active') &&
      exerciseEngine.hasDrawn()
    ) {
      btn.disabled = false;
    }
  }, 300);
  return exerciseEngine;
}

async function loadNextExercise() {
  showScreen('loading');
  setLoadingText('FehlerFix baut deine Übung...', 'Bereite deine nächste Übung vor...');
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 300000); // 5 min
    const res = await fetch('/api/next-exercise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_ID }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (handleSessionLost(body)) return;
      throw new Error(body.error || `Server-Fehler (HTTP ${res.status})`);
    }
    const exercise = await res.json();
    renderExercise(exercise);
    showScreen('exercise');
  } catch (err) {
    console.error('[next-exercise] Fehler:', err);
    showError(friendlyFetchError(err, 'der Übungs-Erstellung'), loadNextExercise);
  }
}

/**
 * Zeigt die Übung an:
 *  - instruction (Aufgabenstellung – KEINE Lösung verraten)
 *  - displayText (Lückentext mit ___, oder Fehlertext)
 *  - Canvas zum handschriftlichen Abschreiben
 */
function renderExercise(exercise) {
  state.currentExercise = exercise;

  const exerciseNum = (parseInt(localStorage.getItem('ff-ex-num') || '0', 10) || 0) + 1;
  document.getElementById('ex-num').textContent = `Übung ${exerciseNum}`;
  const lastLevel = parseInt(localStorage.getItem('ff-level') || '1', 10) || 1;
  document.getElementById('ex-level-badge').textContent = `Level ${lastLevel}`;

  document.getElementById('ex-instruction').textContent =
    exercise.instruction || 'Schreibe den Text ab.';

  // Thema-Badge oben (z.B. "Kommasetzung") – macht das adressierte Thema klar
  const topicEl = document.getElementById('ex-topic');
  if (exercise.topic) {
    topicEl.textContent = exercise.topic;
    topicEl.hidden = false;
  } else {
    topicEl.hidden = true;
  }

  // Achtsamkeiten: 2-3 Dinge, worauf das Kind achten soll
  const tipsEl = document.getElementById('ex-tips');
  const tips = Array.isArray(exercise.tips) ? exercise.tips.filter(Boolean) : [];
  if (tips.length) {
    tipsEl.innerHTML = tips.map((t) => `<li>${escapeHtml(t)}</li>`).join('');
    tipsEl.hidden = false;
  } else {
    tipsEl.innerHTML = '';
    tipsEl.hidden = true;
  }

  const displayEl = document.getElementById('ex-display-text');
  const dictationPlayerEl = document.getElementById('dictation-player');

  // Eventuell laufende Sprachausgabe stoppen (z.B. wenn vorherige Übung Audio war)
  tts.stop();
  resetDictationPlayerUI();

  if (exercise.type === 'audio_dictation') {
    // Aufgabentext NICHT zeigen – nur Player.
    displayEl.style.display = 'none';
    displayEl.innerHTML = '';
    dictationPlayerEl.style.display = 'flex';
    setupDictationPlayer(exercise.correctText || '');
  } else {
    dictationPlayerEl.style.display = 'none';
    displayEl.style.display = '';
    displayEl.innerHTML = '';
    const text = exercise.displayText || '';
    if (exercise.type === 'cloze_text') {
      renderClozeText(displayEl, text);
    } else {
      displayEl.textContent = text;
    }
  }

  // Canvas einrichten + leeren
  const engine = ensureExerciseEngine();
  setTimeout(() => {
    engine.resize();
    engine.clear();
  }, 30);

  document.getElementById('btn-check').disabled = true;
}

/**
 * Rendert einen Lückentext. Unterstützt zwei Marker-Typen:
 *   "___"  → Buchstaben-Lücke (Rechtschreib-Features)
 *   "[ ]"  → Komma-Entscheidungsstelle (Zeichensetzungs-Features):
 *            hier entscheidet das Kind beim Abschreiben, ob ein Komma hingehört.
 */
function renderClozeText(displayEl, text) {
  // Zuerst nach den Komma-Markern [ ] tokenisieren, dann jeden Teil nach ___ .
  const commaToken = /\[\s*\]/g;
  const segments = String(text).split(commaToken);
  segments.forEach((segment, sIdx) => {
    // Buchstaben-Lücken innerhalb des Segments
    const parts = segment.split('___');
    parts.forEach((part, i) => {
      const span = document.createElement('span');
      span.textContent = part;
      displayEl.appendChild(span);
      if (i < parts.length - 1) {
        const blank = document.createElement('span');
        blank.className = 'blank';
        blank.textContent = '____';
        displayEl.appendChild(blank);
      }
    });
    // Komma-Entscheidungsmarker zwischen den Segmenten
    if (sIdx < segments.length - 1) {
      const slot = document.createElement('span');
      slot.className = 'comma-slot';
      slot.textContent = '◦';
      slot.title = 'Komma hier? Du entscheidest beim Abschreiben.';
      displayEl.appendChild(slot);
    }
  });
}

// ─── Audio-Diktat-Player mit Satz-Navigation ────────
// SpeechSynthesis kann nicht mitten im Satz scrubben → wir splitten den Text in Sätze
// und steuern auf Satz-Ebene: Play/Pause, vorheriger/nächster Satz, aktuellen wiederholen.
// Eine Mini-Timeline zeigt visuell, wo wir gerade sind (ohne den Text zu verraten).
function splitIntoSentences(text) {
  if (!text) return [];
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

let dictation = null; // aktueller Player-State

function resetDictationPlayerUI() {
  dictation = null;
  const status = document.getElementById('dictation-status');
  if (status) {
    status.textContent = 'Klick auf „Anhören" – der Text wird langsam vorgelesen.';
    status.classList.remove('is-speaking');
  }
  document.querySelectorAll('.dictation-timeline')?.forEach((el) => el.remove());
}

function setupDictationPlayer(text) {
  const status = document.getElementById('dictation-status');
  const controlsRow = document.querySelector('#dictation-player .dictation-controls');
  if (!controlsRow || !status) return;

  if (!tts.isSupported()) {
    status.textContent =
      'Dein Browser unterstützt keine Sprachausgabe. Bitte nutze Safari oder Chrome.';
    return;
  }

  const sentences = splitIntoSentences(text);
  dictation = { sentences, idx: 0, playing: false };

  // Controls komplett neu aufbauen
  controlsRow.innerHTML = `
    <button class="player-btn" id="dict-prev" aria-label="Vorheriger Satz" disabled>◀ Satz</button>
    <button class="player-btn player-btn-main" id="dict-play">▶ Anhören</button>
    <button class="player-btn" id="dict-replay" aria-label="Aktuellen Satz wiederholen">🔁 Satz</button>
    <button class="player-btn" id="dict-next" aria-label="Nächster Satz">Satz ▶</button>
  `;

  // Timeline-Punkte (zeigt wo wir im Diktat sind – ohne den Text zu verraten)
  let timeline = document.querySelector('#dictation-player .dictation-timeline');
  if (!timeline) {
    timeline = document.createElement('div');
    timeline.className = 'dictation-timeline';
    document.getElementById('dictation-player').appendChild(timeline);
  }
  timeline.innerHTML = sentences
    .map((_, i) => `<button class="timeline-dot" data-idx="${i}" aria-label="Satz ${i + 1}"></button>`)
    .join('');
  timeline.querySelectorAll('.timeline-dot').forEach((dot) => {
    dot.addEventListener('click', () => jumpTo(parseInt(dot.dataset.idx, 10)));
  });

  function updateUI() {
    const playBtn = document.getElementById('dict-play');
    const prevBtn = document.getElementById('dict-prev');
    const nextBtn = document.getElementById('dict-next');
    if (!playBtn) return;
    playBtn.textContent = dictation.playing ? '⏸ Pause' : '▶ Anhören';
    prevBtn.disabled = dictation.idx <= 0;
    nextBtn.disabled = dictation.idx >= sentences.length - 1;

    // Timeline-Markierung
    timeline.querySelectorAll('.timeline-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === dictation.idx);
      dot.classList.toggle('done', i < dictation.idx);
    });

    if (dictation.playing) {
      status.classList.add('is-speaking');
      status.textContent = `Satz ${dictation.idx + 1} von ${sentences.length} – wird vorgelesen, schreib mit!`;
    } else {
      status.classList.remove('is-speaking');
      status.textContent = `Bereit bei Satz ${dictation.idx + 1} von ${sentences.length}. Klick „Anhören".`;
    }
  }

  function playCurrent() {
    const s = sentences[dictation.idx];
    if (!s) return;
    tts.stop();
    dictation.playing = true;
    updateUI();
    tts.speakThen(s, () => {
      // Auto-advance zum nächsten Satz
      if (!dictation) return;
      if (dictation.idx < sentences.length - 1) {
        dictation.idx++;
        playCurrent();
      } else {
        dictation.playing = false;
        status.classList.remove('is-speaking');
        status.textContent = `Fertig. Du kannst einzelne Sätze zurückspulen und nochmal hören.`;
        updateUI();
      }
    });
  }

  function jumpTo(i) {
    if (!dictation) return;
    tts.stop();
    dictation.idx = Math.max(0, Math.min(sentences.length - 1, i));
    dictation.playing = false;
    playCurrent();
  }

  document.getElementById('dict-play').onclick = () => {
    if (dictation.playing) {
      tts.stop();
      dictation.playing = false;
      updateUI();
    } else {
      playCurrent();
    }
  };
  document.getElementById('dict-prev').onclick = () => jumpTo(dictation.idx - 1);
  document.getElementById('dict-next').onclick = () => jumpTo(dictation.idx + 1);
  document.getElementById('dict-replay').onclick = () => jumpTo(dictation.idx);

  updateUI();

  tts.on('error', () => {
    status.textContent = 'Sprachausgabe ging gerade nicht. Versuch es nochmal.';
    status.classList.remove('is-speaking');
    if (dictation) {
      dictation.playing = false;
      updateUI();
    }
  });
}

// Submit: handschriftliche Abschrift als Bild an Server
document.getElementById('btn-check').addEventListener('click', async () => {
  const engine = exerciseEngine;
  if (!engine || !engine.hasDrawn()) {
    alert('Bitte schreibe zuerst etwas auf das Notizbuch.');
    return;
  }
  // Sprachausgabe stoppen, falls sie noch läuft
  tts.stop();
  showScreen('loading');
  setLoadingText('FehlerFix prüft deine Lösung...', 'Schaue mir deine Schrift genau an...');
  try {
    const raw = engine.toJpeg(0.85);
    const small = await downscaleImage(raw, 1400, 0.8);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 300000); // 5 min
    const res = await fetch('/api/submit-exercise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_ID, image: small }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (handleSessionLost(body)) return;
      throw new Error(body.error || `Server-Fehler (HTTP ${res.status})`);
    }
    const data = await res.json();
    localStorage.setItem('ff-ex-num', String(data.exercisesCompleted));
    localStorage.setItem('ff-level', String(data.level));
    renderProgress(data);
    showScreen('progress');
  } catch (err) {
    console.error('[submit] Fehler:', err);
    showError(friendlyFetchError(err, 'der Prüfung'), () => showScreen('exercise'));
  }
});

// Resize-Trigger für Exercise-Canvas
new MutationObserver(() => {
  if (
    document.getElementById('screen-exercise').classList.contains('active') &&
    exerciseEngine
  ) {
    setTimeout(() => exerciseEngine.resize(), 30);
  }
}).observe(document.getElementById('screen-exercise'), {
  attributes: true,
  attributeFilter: ['class'],
});

// ─────────────────────────────────────────────────────────
// Screen 5: Fortschritt – Stats + KI-Rückmeldung
// ─────────────────────────────────────────────────────────
function renderProgress(data) {
  document.getElementById('stat-level').textContent = `Level ${data.level}`;
  document.getElementById('level-hint').textContent =
    data.pointsToNextLevel > 0
      ? `Noch ${data.pointsToNextLevel} Punkte bis Level ${data.level + 1}`
      : `Level ${data.level} erreicht!`;
  document.getElementById('stat-points-delta').textContent = `+${data.points} in dieser Übung`;
  document.getElementById('stat-exercises').textContent = data.exercisesCompleted;

  const fill = document.getElementById('level-progress-fill');
  fill.style.width = '0%';
  setTimeout(() => {
    fill.style.width = (data.levelProgressPercent || 0) + '%';
  }, 80);

  animateCount(document.getElementById('stat-points'), 0, data.totalPoints, 900);

  // KI-Rückmeldung: positiv als Bullets, negativ als konkrete Wort-Korrekturen
  const good = Array.isArray(data.summary_good) ? data.summary_good.filter(Boolean) : [];
  const corrections = Array.isArray(data.word_corrections)
    ? data.word_corrections.filter((w) => w && w.wrong && w.correct)
    : [];

  const goodCard = document.getElementById('fb-good-card');
  const badCard = document.getElementById('fb-bad-card');
  const goodList = document.getElementById('fb-good-list');
  const correctionsEl = document.getElementById('word-corrections');

  goodList.innerHTML = good.map((s) => `<li>${escapeHtml(s)}</li>`).join('');
  goodCard.style.display = good.length ? '' : 'none';

  if (corrections.length) {
    correctionsEl.innerHTML = corrections
      .map((c) => {
        const strategy = c.fresch_strategy ? escapeHtml(c.fresch_strategy) : '';
        const strategyTag = strategy
          ? `<span class="fresch-tag fresch-tag-${strategy.toLowerCase().replace(/[^a-zä]/g, '')}">FRESCH · ${strategy}</span>`
          : '';
        return `
          <div class="word-correction">
            <div class="word-correction-row">
              <span class="word-wrong">${escapeHtml(c.wrong)}</span>
              <span class="word-arrow">→</span>
              <span class="word-correct">${escapeHtml(c.correct)}</span>
              ${strategyTag}
            </div>
            ${c.explanation ? `<p class="word-explanation">${escapeHtml(c.explanation)}</p>` : ''}
          </div>
        `;
      })
      .join('');
    badCard.style.display = '';
  } else {
    correctionsEl.innerHTML = '';
    badCard.style.display = 'none';
  }

  // Erklärung
  const explCard = document.getElementById('explanation-card');
  const explText = document.getElementById('explanation-text');
  if (data.explanation) {
    explText.textContent = data.explanation;
    explCard.style.display = '';
  } else {
    explCard.style.display = 'none';
  }
}

function animateCount(el, from, to, duration) {
  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

document.getElementById('btn-next-exercise').addEventListener('click', loadNextExercise);

// ─────────────────────────────────────────────────────────
// Fehler-Screen
// ─────────────────────────────────────────────────────────
document.getElementById('btn-retry').addEventListener('click', () => {
  if (typeof state.retryAction === 'function') {
    state.retryAction();
  } else {
    showScreen('welcome');
  }
});

// ─────────────────────────────────────────────────────────
// Util
// ─────────────────────────────────────────────────────────
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ═══════════════════════════════════════════════════════════
 * AUTH-FRONTEND: Login/Registrierung, Seitenmenü, Lehrer-Dashboard
 * ═══════════════════════════════════════════════════════════ */

const authState = { user: null, authEnabled: false };

async function apiJson(url, opts) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Fehler (${res.status})`);
  return data;
}

// Nav-Menü-Button sichtbar machen wenn eingeloggt
function refreshNavForUser() {
  const menuBtn = document.getElementById('btn-open-menu');
  if (menuBtn) menuBtn.hidden = !authState.user;
}

// ─── Init: wer ist eingeloggt? ───
async function initAuth() {
  try {
    const me = await apiJson('/api/auth/me');
    authState.authEnabled = me.authEnabled;
    authState.user = me.user || null;
  } catch (e) {
    authState.authEnabled = false;
    authState.user = null;
  }
  refreshNavForUser();

  if (authState.user && authState.user.role === 'teacher') {
    showTeacherDashboard();
    return;
  }
  if (authState.user && authState.user.role === 'student') {
    // Profil aus Account übernehmen
    if (authState.user.profile) {
      state.profile = {
        grade: authState.user.profile.grade || null,
        schoolType: authState.user.profile.schoolType || null,
        state: authState.user.profile.state || null,
        language: authState.user.profile.language || 'de',
      };
    }
    showScreen('welcome');
    return;
  }
  // Niemand eingeloggt
  if (authState.authEnabled) {
    renderAuthScreen();
    showScreen('auth');
  } else {
    showScreen('welcome'); // Gast-Modus (DB aus)
  }
}

// ─── Auth-Screen ───
let authUI = { role: 'student', studentTab: 'login', method: 'class', teacherTab: 'login' };

function renderAuthScreen() {
  // Rollen
  document.querySelectorAll('.role-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.role === authUI.role);
    b.onclick = () => { authUI.role = b.dataset.role; renderAuthScreen(); };
  });
  document.getElementById('auth-student').hidden = authUI.role !== 'student';
  document.getElementById('auth-teacher').hidden = authUI.role !== 'teacher';

  // Schüler-Tabs
  document.querySelectorAll('#auth-student [data-authtab]').forEach((b) => {
    b.classList.toggle('active', b.dataset.authtab === authUI.studentTab);
    b.onclick = () => { authUI.studentTab = b.dataset.authtab; renderAuthScreen(); };
  });
  // Methoden
  document.querySelectorAll('#auth-student [data-method]').forEach((b) => {
    b.classList.toggle('active', b.dataset.method === authUI.method);
    b.onclick = () => { authUI.method = b.dataset.method; renderAuthScreen(); };
  });
  document.getElementById('form-class').hidden = authUI.method !== 'class';
  document.getElementById('form-email').hidden = authUI.method !== 'email';
  document.getElementById('btn-auth-submit').textContent =
    authUI.studentTab === 'login' ? 'Anmelden →' : 'Registrieren →';
  document.getElementById('auth-error').hidden = true;

  // Lehrer-Tabs
  document.querySelectorAll('#auth-teacher [data-teachtab]').forEach((b) => {
    b.classList.toggle('active', b.dataset.teachtab === authUI.teacherTab);
    b.onclick = () => { authUI.teacherTab = b.dataset.teachtab; renderAuthScreen(); };
  });
  document.getElementById('teacher-name-field').hidden = authUI.teacherTab !== 'register';
  document.getElementById('btn-teacher-submit').textContent =
    authUI.teacherTab === 'login' ? 'Anmelden →' : 'Registrieren →';
  document.getElementById('teacher-error').hidden = true;
}

function showAuthError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.hidden = false;
}

// Zeigt eine grüne Erfolgsmeldung im Auth-Fehlerfeld (wird für "bitte anmelden" genutzt)
function showAuthSuccess(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.hidden = false;
  el.style.background = '#e6f4e8';
  el.style.color = '#2a6c34';
}
function resetAuthMsgStyle(id) {
  const el = document.getElementById(id);
  el.style.background = '';
  el.style.color = '';
}

// Schüler-Submit
document.getElementById('btn-auth-submit').addEventListener('click', async () => {
  const isRegister = authUI.studentTab === 'register';
  resetAuthMsgStyle('auth-error');
  try {
    if (authUI.method === 'class') {
      const classCode = document.getElementById('in-class-code').value.trim();
      const displayName = document.getElementById('in-class-name').value.trim();
      const pin = document.getElementById('in-class-pin').value.trim();
      if (isRegister) {
        await apiJson('/api/auth/register-class', { method: 'POST', body: JSON.stringify({ classCode, displayName, pin }) });
        // Nach Registrierung: NICHT einloggen – zum Login-Tab wechseln, Felder behalten
        afterRegister('auth-error', 'Registrierung erfolgreich! Melde dich jetzt mit deinem Namen und deiner PIN an.');
        return;
      }
      const { user } = await apiJson('/api/auth/login-class', { method: 'POST', body: JSON.stringify({ classCode, displayName, pin }) });
      onLoginSuccess(user);
    } else {
      const email = document.getElementById('in-email').value.trim();
      const password = document.getElementById('in-password').value;
      if (isRegister) {
        await apiJson('/api/auth/register-email', { method: 'POST', body: JSON.stringify({ email, password, profile: state.profile }) });
        afterRegister('auth-error', 'Registrierung erfolgreich! Melde dich jetzt mit deiner E-Mail an.');
        return;
      }
      const { user } = await apiJson('/api/auth/login-email', { method: 'POST', body: JSON.stringify({ email, password }) });
      onLoginSuccess(user);
    }
  } catch (e) {
    resetAuthMsgStyle('auth-error');
    showAuthError('auth-error', e.message);
  }
});

// Nach erfolgreicher Registrierung: auf Login-Tab wechseln, Erfolgsmeldung zeigen
function afterRegister(errId, msg) {
  authUI.studentTab = 'login';
  renderAuthScreen();
  showAuthSuccess(errId, msg);
}

// Lehrer-Submit
document.getElementById('btn-teacher-submit').addEventListener('click', async () => {
  const isRegister = authUI.teacherTab === 'register';
  resetAuthMsgStyle('teacher-error');
  try {
    const email = document.getElementById('in-teacher-email').value.trim();
    const password = document.getElementById('in-teacher-password').value;
    const displayName = document.getElementById('in-teacher-name').value.trim();
    if (isRegister) {
      await apiJson('/api/teacher/register', { method: 'POST', body: JSON.stringify({ email, password, displayName }) });
      authUI.teacherTab = 'login';
      renderAuthScreen();
      showAuthSuccess('teacher-error', 'Registrierung erfolgreich! Melde dich jetzt mit deiner E-Mail an.');
      return;
    }
    const { user } = await apiJson('/api/teacher/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    onLoginSuccess(user);
  } catch (e) {
    resetAuthMsgStyle('teacher-error');
    showAuthError('teacher-error', e.message);
  }
});

// Gast
document.getElementById('btn-guest').addEventListener('click', () => {
  showScreen('welcome');
});

function onLoginSuccess(user) {
  authState.user = user;
  refreshNavForUser();
  if (user.role === 'teacher') {
    showTeacherDashboard();
  } else {
    if (user.profile) {
      state.profile = {
        grade: user.profile.grade || null,
        schoolType: user.profile.schoolType || null,
        state: user.profile.state || null,
        language: user.profile.language || 'de',
      };
    }
    showScreen('welcome');
  }
}

// ─── Seitenmenü (Drawer) ───
function openDrawer() {
  renderDrawer();
  document.getElementById('drawer-overlay').hidden = false;
  document.getElementById('drawer').hidden = false;
}
function closeDrawer() {
  document.getElementById('drawer-overlay').hidden = true;
  document.getElementById('drawer').hidden = true;
}
document.getElementById('btn-open-menu').addEventListener('click', openDrawer);
document.getElementById('drawer-close').addEventListener('click', closeDrawer);
document.getElementById('drawer-overlay').addEventListener('click', closeDrawer);

async function renderDrawer() {
  const u = authState.user;
  const userBox = document.getElementById('drawer-user');
  const nav = document.getElementById('drawer-nav');
  if (!u) { userBox.innerHTML = ''; nav.innerHTML = ''; return; }

  const name = u.displayName || u.email || 'Angemeldet';
  const meta = u.role === 'teacher' ? 'Lehrkraft' : (u.authMethod === 'email' ? u.email : 'Schüler/in');
  userBox.innerHTML = `<div class="du-name">${escapeHtml(name)}</div><div class="du-meta">${escapeHtml(meta)}</div>`;

  nav.innerHTML = '';
  if (u.role === 'teacher') {
    addDrawerItem(nav, 'Zum Klassenraum', () => { closeDrawer(); showTeacherDashboard(); });
    addDrawerItem(nav, 'Abmelden', logout, true);
    return;
  }

  // ── Schüler ──
  // Aktuelle Klasse anzeigen (falls vorhanden); dann Beitreten NUR wenn (noch) keine Klasse.
  const classInfo = document.createElement('div');
  classInfo.className = 'drawer-join';
  classInfo.innerHTML = '<div class="drawer-msg">Lade Klasse…</div>';
  nav.appendChild(classInfo);

  let currentClass = null;
  try {
    const res = await apiJson('/api/auth/my-class');
    currentClass = res.class;
  } catch (e) { /* ignorieren */ }

  if (currentClass) {
    // In einer Klasse → nur Anzeige, KEIN Beitreten-Feld mehr
    classInfo.innerHTML = `
      <div class="du-meta" style="margin-bottom:2px">Deine Klasse</div>
      <div class="du-name">${escapeHtml(currentClass.name || 'Klasse')}</div>
      <div class="drawer-msg">Code: ${escapeHtml(currentClass.code || '')}</div>`;
  } else {
    // Noch keine Klasse → Beitreten anbieten
    classInfo.innerHTML = `
      <div class="du-meta" style="margin-bottom:6px">Einer Klasse beitreten</div>
      <input id="drawer-join-code" placeholder="Klassencode" autocomplete="off" />
      <button class="btn-secondary" id="drawer-join-btn" style="width:100%">Klasse beitreten</button>
      <div class="drawer-msg" id="drawer-join-msg"></div>`;
    classInfo.querySelector('#drawer-join-btn').onclick = async () => {
      const code = classInfo.querySelector('#drawer-join-code').value.trim();
      const msg = classInfo.querySelector('#drawer-join-msg');
      try {
        const { user, className } = await apiJson('/api/auth/join-class', {
          method: 'POST', body: JSON.stringify({ classCode: code }),
        });
        authState.user = user; // classId aktualisieren
        msg.className = 'drawer-msg ok';
        msg.textContent = 'Du bist jetzt in: ' + (className || 'der Klasse');
        // Menü neu rendern → zeigt jetzt die Klasse statt des Beitreten-Felds
        setTimeout(renderDrawer, 900);
      } catch (e) {
        msg.className = 'drawer-msg err';
        msg.textContent = e.message;
      }
    };
  }

  addDrawerItem(nav, 'Abmelden', logout, true);
}

function addDrawerItem(nav, label, onClick, danger) {
  const b = document.createElement('button');
  b.className = 'drawer-item' + (danger ? ' danger' : '');
  b.textContent = label;
  b.onclick = onClick;
  nav.appendChild(b);
}

async function logout() {
  try { await apiJson('/api/auth/logout', { method: 'POST' }); } catch (e) {}
  authState.user = null;
  refreshNavForUser();
  closeDrawer();
  renderAuthScreen();
  showScreen('auth');
}

// ─── Lehrer-Dashboard ───
async function showTeacherDashboard() {
  showScreen('teacher-dash');
  document.getElementById('dash-students').hidden = true;
  document.getElementById('dash-detail').hidden = true;
  document.querySelector('.dash-classes').hidden = false;
  document.getElementById('btn-new-class').hidden = false;
  const wrap = document.getElementById('dash-classes');
  wrap.innerHTML = '<div class="dash-empty">Lade Klassen…</div>';
  try {
    const { classes } = await apiJson('/api/teacher/classes');
    if (!classes.length) {
      wrap.innerHTML = '<div class="dash-empty">Noch keine Klassen. Leg deine erste Klasse an!</div>';
      return;
    }
    wrap.innerHTML = '';
    classes.forEach((c) => {
      const card = document.createElement('div');
      card.className = 'class-card';
      card.innerHTML = `
        <div class="cc-name">${escapeHtml(c.name)}</div>
        <span class="cc-code">${escapeHtml(c.class_code)}</span>
        <div class="cc-meta">${c.studentCount} Schüler/in${c.studentCount === 1 ? '' : 'nen'}</div>`;
      card.onclick = () => showClassStudents(c);
      wrap.appendChild(card);
    });
  } catch (e) {
    wrap.innerHTML = `<div class="dash-empty">Fehler: ${escapeHtml(e.message)}</div>`;
  }
}

document.getElementById('btn-new-class').addEventListener('click', async () => {
  const name = prompt('Name der Klasse (z. B. "6b Musterschule"):');
  if (!name) return;
  try {
    const { class: cls } = await apiJson('/api/teacher/classes', {
      method: 'POST', body: JSON.stringify({ name }),
    });
    alert('Klasse angelegt!\n\nKlassencode: ' + cls.class_code + '\n\nGib diesen Code an deine Schüler weiter.');
    showTeacherDashboard();
  } catch (e) {
    alert('Fehler: ' + e.message);
  }
});

document.getElementById('btn-back-classes').addEventListener('click', showTeacherDashboard);

async function showClassStudents(cls) {
  document.querySelector('.dash-classes').hidden = true;
  document.getElementById('btn-new-class').hidden = true;
  document.getElementById('dash-detail').hidden = true;
  const panel = document.getElementById('dash-students');
  panel.hidden = false;
  document.getElementById('dash-class-title').textContent = cls.name;
  document.getElementById('dash-class-code').innerHTML =
    `Klassencode zum Beitreten: <b>${escapeHtml(cls.class_code)}</b>`;
  const list = document.getElementById('dash-students-list');
  list.innerHTML = '<div class="dash-empty">Lade Schüler…</div>';
  try {
    const { students } = await apiJson(`/api/teacher/classes/${cls.id}/students`);
    if (!students.length) {
      list.innerHTML = '<div class="dash-empty">Noch keine Schüler in dieser Klasse.</div>';
      return;
    }
    list.innerHTML = '';
    students.forEach((s) => {
      const weak = (s.topWeaknesses || []).map((w) => w.name).join(', ') || '–';
      const row = document.createElement('div');
      row.className = 'student-row';
      row.innerHTML = `
        <div>
          <div class="sr-name">${escapeHtml(s.display_name || s.email || 'Unbenannt')}</div>
          <div class="sr-weak">Übt gerade: ${escapeHtml(weak)}</div>
        </div>
        <div class="sr-stats">
          <div class="sr-level">Level ${s.level}</div>
          ${s.exercisesCompleted} Übungen
        </div>`;
      row.onclick = () => showStudentDetail(s.id, cls);
      list.appendChild(row);
    });
  } catch (e) {
    list.innerHTML = `<div class="dash-empty">Fehler: ${escapeHtml(e.message)}</div>`;
  }
}

document.getElementById('btn-back-students').addEventListener('click', () => {
  document.getElementById('dash-detail').hidden = true;
  document.getElementById('dash-students').hidden = false;
});

async function showStudentDetail(studentId, cls) {
  document.getElementById('dash-students').hidden = true;
  const panel = document.getElementById('dash-detail');
  panel.hidden = false;
  const content = document.getElementById('dash-detail-content');
  content.innerHTML = '<div class="dash-empty">Lade Fehlerprofil…</div>';
  try {
    const { student } = await apiJson(`/api/teacher/students/${studentId}`);
    const p = student.profile || {};
    const profileLine = [p.grade ? 'Klasse ' + p.grade : null, p.schoolType, p.state].filter(Boolean).join(' · ');
    const bars = (student.errorProfile || []).map((f) => {
      const m = Math.round(f.mastery ?? 0);
      const color = m < 40 ? 'var(--coral)' : m < 70 ? '#e0a83d' : '#6dbe7a';
      return `<div class="feature-bar-row">
        <div class="feature-bar-label"><span>${escapeHtml(f.name)}</span><span>${m}%</span></div>
        <div class="feature-bar-track"><div class="feature-bar-fill" style="width:${m}%;background:${color}"></div></div>
      </div>`;
    }).join('') || '<div class="dash-empty">Noch keine Analyse – Schüler/in hat noch nicht geübt.</div>';

    const recent = (student.recentExercises || []).slice(0, 10).map((r) => {
      const d = new Date(r.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      return `<div class="feature-bar-label"><span>${d} · ${escapeHtml(r.feature || r.exercise_type || '–')}</span><span>${r.score ?? '–'}%</span></div>`;
    }).join('') || '<div class="dash-empty">Noch keine Übungen.</div>';

    content.innerHTML = `
      <h2 class="title-l">${escapeHtml(student.displayName || student.email || 'Schüler/in')}</h2>
      <div class="kicker">${escapeHtml(profileLine || '–')}</div>
      <div class="detail-card" style="margin-top:16px">
        <div class="stat-kicker stat-kicker-blue">Fortschritt</div>
        <p>Level <b>${student.level}</b> · ${student.points} Punkte · ${student.exercisesCompleted} Übungen</p>
      </div>
      <div class="detail-card">
        <div class="stat-kicker stat-kicker-blue">Fehlerprofil – Übungsbedarf pro Bereich</div>
        <div style="margin-top:14px">${bars}</div>
      </div>
      <div class="detail-card">
        <div class="stat-kicker stat-kicker-blue">Letzte Übungen</div>
        <div style="margin-top:14px">${recent}</div>
      </div>`;
  } catch (e) {
    content.innerHTML = `<div class="dash-empty">Fehler: ${escapeHtml(e.message)}</div>`;
  }
}

// ─── Start ───
initAuth();
