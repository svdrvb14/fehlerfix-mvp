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
        Salvador Elsen<br>
        – Schülerprojekt FehlerFix –<br>
        Kontakt: s_elsen@icloud.com
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
  profile: { grade: null, schoolType: null }, // wird im Profile-Screen gesetzt
  currentExercise: null,
  retryAction: null,
};

// ─────────────────────────────────────────────────────────
// Profile-Screen: Klassenstufe + Schulform abfragen
// ─────────────────────────────────────────────────────────
const SCHOOL_TYPES = [
  { value: 'Grundschule', label: 'Grundschule' },
  { value: 'Hauptschule', label: 'Hauptschule' },
  { value: 'Realschule', label: 'Realschule' },
  { value: 'Gymnasium', label: 'Gymnasium' },
  { value: 'Gesamtschule', label: 'Gesamtschule' },
  { value: 'Berufsschule', label: 'Berufsschule / BBS' },
];

function renderProfileScreen() {
  // Klassenstufen-Buttons (1-13)
  const gradeWrap = document.getElementById('grade-buttons');
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
      updateProfileContinue();
    });
    gradeWrap.appendChild(b);
  }
  // Schulform-Buttons
  const schoolWrap = document.getElementById('school-buttons');
  schoolWrap.innerHTML = '';
  SCHOOL_TYPES.forEach((s) => {
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
  // Falls schon was gewählt war (z.B. nach Zurück-Navigation), Auswahl wiederherstellen
  if (state.profile.grade) {
    const sel = gradeWrap.querySelector(`[data-grade="${state.profile.grade}"]`);
    if (sel) sel.classList.add('selected');
  }
  if (state.profile.schoolType) {
    const sel = schoolWrap.querySelector(`[data-value="${state.profile.schoolType}"]`);
    if (sel) sel.classList.add('selected');
  }
  updateProfileContinue();
}

function updateProfileContinue() {
  document.getElementById('btn-profile-continue').disabled =
    !state.profile.grade || !state.profile.schoolType;
}

document.getElementById('btn-profile-continue').addEventListener('click', () => {
  // Themen jetzt anhand der Klassenstufe ziehen
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
function createBrowserTTS({ lang = 'de-DE', rate = 0.7, pitch = 1.0 } = {}) {
  const listeners = {};
  const emit = (event, payload) => (listeners[event] || []).forEach((cb) => cb(payload));
  let utterance = null;
  let preferredVoice = null;

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
        utterance.onend = () => emit('end');
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
    },

    isSpeaking: () =>
      'speechSynthesis' in window && speechSynthesis.speaking && !speechSynthesis.paused,
    isPaused: () => 'speechSynthesis' in window && speechSynthesis.paused,

    on(event, cb) {
      (listeners[event] = listeners[event] || []).push(cb);
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
  // Vor dem Schreiben kommt der Profile-Screen (Klassenstufe + Schulform)
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
  document.getElementById('loading-status').textContent = 'Bereite deine Texte vor...';
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
  document.getElementById('loading-status').textContent = 'Bereite deine nächste Übung vor...';
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
      const parts = text.split('___');
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

// ─── Audio-Diktat-Player-Logik ───────────────────────
function resetDictationPlayerUI() {
  const playBtn = document.getElementById('dictation-play');
  const pauseBtn = document.getElementById('dictation-pause');
  const replayBtn = document.getElementById('dictation-replay');
  const status = document.getElementById('dictation-status');
  if (!playBtn) return;
  playBtn.style.display = '';
  playBtn.textContent = '▶ Anhören';
  pauseBtn.style.display = 'none';
  pauseBtn.textContent = '⏸ Pause';
  replayBtn.style.display = 'none';
  status.classList.remove('is-speaking');
  status.textContent = 'Klick auf „Anhören" – der Text wird langsam vorgelesen.';
}

function setupDictationPlayer(text) {
  const playBtn = document.getElementById('dictation-play');
  const pauseBtn = document.getElementById('dictation-pause');
  const replayBtn = document.getElementById('dictation-replay');
  const status = document.getElementById('dictation-status');

  if (!tts.isSupported()) {
    status.textContent =
      'Dein Browser unterstützt keine Sprachausgabe. Bitte nutze Safari oder Chrome.';
    playBtn.disabled = true;
    return;
  }

  // Listener werden bei jeder Übung neu registriert – browser-tts dedupliziert nicht selbst,
  // wir nutzen aber nur Single-Player-State, also OK.
  function startPlayback() {
    tts.speak(text);
    status.classList.add('is-speaking');
    status.textContent = 'Wird vorgelesen... schreib mit!';
    playBtn.style.display = 'none';
    pauseBtn.style.display = '';
    pauseBtn.textContent = '⏸ Pause';
    replayBtn.style.display = 'none';
  }

  playBtn.onclick = startPlayback;

  pauseBtn.onclick = () => {
    if (tts.isPaused()) {
      tts.resume();
      pauseBtn.textContent = '⏸ Pause';
      status.textContent = 'Wird vorgelesen... schreib mit!';
      status.classList.add('is-speaking');
    } else {
      tts.pause();
      pauseBtn.textContent = '▶ Weiter';
      status.textContent = 'Pausiert. Klick auf „Weiter".';
      status.classList.remove('is-speaking');
    }
  };

  replayBtn.onclick = startPlayback;

  // Globale TTS-Events steuern UI
  tts.on('end', () => {
    if (!document.getElementById('screen-exercise').classList.contains('active')) return;
    pauseBtn.style.display = 'none';
    playBtn.style.display = 'none';
    replayBtn.style.display = '';
    status.classList.remove('is-speaking');
    status.textContent = 'Fertig vorgelesen. Du kannst nochmal hören, wenn du willst.';
  });

  tts.on('error', () => {
    status.textContent = 'Sprachausgabe ging gerade nicht. Versuch es nochmal.';
    status.classList.remove('is-speaking');
    playBtn.style.display = '';
    pauseBtn.style.display = 'none';
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
  document.getElementById('loading-status').textContent = 'KI schaut sich deine Schrift an...';
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
      .map(
        (c) => `
          <div class="word-correction">
            <div class="word-correction-row">
              <span class="word-wrong">${escapeHtml(c.wrong)}</span>
              <span class="word-arrow">→</span>
              <span class="word-correct">${escapeHtml(c.correct)}</span>
            </div>
            ${c.explanation ? `<p class="word-explanation">${escapeHtml(c.explanation)}</p>` : ''}
          </div>
        `
      )
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
