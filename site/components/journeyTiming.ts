// Gemeinsame Scroll-Zeitachse für JourneyPath (Linie + Stift) und
// JourneyCardReveal (die Box selbst), damit beide exakt denselben Ablauf
// verwenden: Linie zeichnet -> Stift erscheint -> Box blendet ein -> Box
// rastet ein (kurze Pause) -> erst danach beginnt die nächste Linie.

// Ab wann (relativ zur Kartenoberkante, in Vielfachen der Fensterhöhe) der
// Stift sichtbar wird.
export const PENCIL_TRIGGER_VH_FRACTION = 0.35;
// Kleiner Puffer zwischen "Stift fertig" und "Box beginnt", damit es nicht
// wie ein harter Schnitt wirkt.
export const PENCIL_TO_BOX_GAP_PX = 20;
// Scroll-Distanz, über die die Box selbst einblendet.
export const BOX_FADE_PX = 170;
// Nach dem Einblenden bleibt die Box für diese Scroll-Distanz einfach nur
// sichtbar stehen ("eingerastet"), bevor die nächste Linie losgeht.
export const SNAP_DELAY_PX = 275;

export function pencilTriggerY(cardTopY: number, viewportHeight: number): number {
  return cardTopY - viewportHeight * PENCIL_TRIGGER_VH_FRACTION;
}

export function boxRevealStart(cardTopY: number, viewportHeight: number): number {
  return pencilTriggerY(cardTopY, viewportHeight) + PENCIL_TO_BOX_GAP_PX;
}

export function boxRevealEnd(cardTopY: number, viewportHeight: number): number {
  return boxRevealStart(cardTopY, viewportHeight) + BOX_FADE_PX;
}

// Frühester Scroll-Punkt, an dem die NÄCHSTE Linie zu zeichnen beginnen
// darf: erst nachdem diese Karte fertig eingeblendet UND kurz eingerastet
// ist.
export function nextLineDrawStart(cardTopY: number, viewportHeight: number): number {
  return boxRevealEnd(cardTopY, viewportHeight) + SNAP_DELAY_PX;
}
