// Gemeinsame Scroll-Zeitachse für JourneyPath (Linie + Stift), JourneyCardReveal
// (die Box selbst) und den Scroll-Lock: alle drei richten sich nach demselben
// Ziel - der Karte exakt in der Bildschirmmitte - und laufen rückwärts von
// diesem Punkt aus: Linie zeichnet -> Stift erscheint -> Box blendet ein ->
// ein kleines Stück weiterscrollen -> echtes Einrasten in der Bildschirmmitte
// -> erst nach erneutem Scrollen geht es weiter.

// Scroll-Distanz, über die die Box selbst einblendet.
export const BOX_FADE_PX = 170;
// Puffer zwischen "Stift fertig" und "Box beginnt", gegen einen harten Schnitt.
export const PENCIL_TO_BOX_GAP_PX = 20;
// Scroll-Distanz, über die der Stift selbst einblendet.
export const PENCIL_FADE_PX = 60;
// Nachdem die Box voll erschienen ist, wird noch diese Distanz "mini bisschen"
// weitergescrollt, bevor der Bildschirm exakt in der Kartenmitte einrastet.
export const SETTLE_BUFFER_PX = 90;
// Der Stopp ist NICHT zeitgesteuert: er hält exakt so lange, wie die
// Rest-Trägheit der auslösenden Geste anhält, und löst sich sofort bei
// einer NEUEN Abwärts-Geste. Eine neue Geste erkennen wir auf zwei Wegen:
//
// 1. Pause: seit dem letzten Wheel-Event ist mindestens diese Zeit
//    vergangen - die alte Geste ist ausgelaufen, das nächste Event ist
//    eine bewusste neue.
export const WHEEL_GESTURE_GAP_MS = 250;
// 2. Delta-Spike: Trackpad-Trägheit klingt monoton ab. Springt der Betrag
//    eines Wheel-Deltas plötzlich deutlich über das zuletzt gesehene
//    (abklingende) Delta, hat der Nutzer mitten in die Trägheit hinein neu
//    geflickt - auch ohne messbare Pause.
export const WHEEL_SPIKE_FACTOR = 1.75;
export const WHEEL_SPIKE_MIN_DELTA = 8;
// Referenzfenster für die Spike-Erkennung: verglichen wird gegen den
// Höchstwert der letzten X ms, nicht gegen die ganze Geste seit dem
// Einrasten. Ein kräftiger Ausgangs-Flick soll nicht auf Dauer die Latte
// für "neue Geste" hochhalten - die Referenz soll mit der tatsächlich
// abklingenden Trägheit mitschrumpfen, damit ein normaler zweiter Flick
// kurz danach zuverlässig als neue Geste erkannt wird.
export const WHEEL_SPIKE_WINDOW_MS = 150;
// Reines Sicherheitsventil gegen Festhängen bei ununterbrochenem
// Dauerscrollen ohne jede Pause (kein normaler Bestandteil des Verhaltens).
export const LOCK_MAX_HOLD_MS = 2000;
// Wie weit über einen Lock-Punkt zurückgescrollt werden muss, bevor er beim
// nächsten Runterscrollen wieder einrastet.
export const RELOCK_MARGIN_PX = 120;

// Scroll-Position, bei der die Kartenmitte exakt auf der Bildschirmmitte
// liegt – das ist zugleich der Punkt, an dem der Bildschirm einrastet.
export function centerLockY(cardTop: number, cardHeight: number, viewportHeight: number): number {
  return cardTop + cardHeight / 2 - viewportHeight / 2;
}

export function boxRevealEnd(cardTop: number, cardHeight: number, viewportHeight: number): number {
  return centerLockY(cardTop, cardHeight, viewportHeight) - SETTLE_BUFFER_PX;
}

export function boxRevealStart(cardTop: number, cardHeight: number, viewportHeight: number): number {
  return boxRevealEnd(cardTop, cardHeight, viewportHeight) - BOX_FADE_PX;
}

// Scroll-Position, an der der Stift vollständig sichtbar ist (Linie hat zu
// diesem Zeitpunkt ihren Stop-Punkt erreicht).
export function pencilTriggerY(cardTop: number, cardHeight: number, viewportHeight: number): number {
  return boxRevealStart(cardTop, cardHeight, viewportHeight) - PENCIL_TO_BOX_GAP_PX;
}
