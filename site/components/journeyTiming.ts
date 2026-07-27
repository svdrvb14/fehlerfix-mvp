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
// Wie lange der Scroll nach dem Einrasten blockiert bleibt, bevor erneutes
// Scrollen wieder durchgelassen wird.
export const LOCK_COOLDOWN_MS = 550;

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
