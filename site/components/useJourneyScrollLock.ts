"use client";

import { useEffect } from "react";
import {
  centerLockY,
  LOCK_MAX_HOLD_MS,
  RELOCK_MARGIN_PX,
  WHEEL_GESTURE_GAP_MS,
  WHEEL_SPIKE_FACTOR,
  WHEEL_SPIKE_MIN_DELTA,
} from "./journeyTiming";

const MIN_VIEWPORT_WIDTH = 768;

function measureLockPoints(cardIds: readonly string[]): number[] {
  const vh = window.innerHeight;
  const points: number[] = [];
  for (const id of cardIds) {
    const el = document.getElementById(id);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    points.push(centerLockY(top, rect.height, vh));
  }
  return points;
}

// Die Seite hat global scroll-behavior: smooth - behavior "auto" würde also
// jede Korrektur zur animierten Gleitfahrt machen. Hier muss es immer ein
// sofortiger Sprung sein.
function scrollToInstant(top: number) {
  window.scrollTo({ top, behavior: "instant" });
}

// Harter Stopp an jeder Karte, als würde die Seite dort enden - wie am
// unteren Rand eines Dokuments: kein Zurückgleiten, kein Wackeln, keine
// Wartezeit. Mechanik:
//
// - Überschreitet der Scroll beim Runterscrollen einen Lock-Punkt
//   (Kartenmitte = Bildschirmmitte), wird die Position noch IM selben
//   Scroll-Event auf den Punkt zurückgesetzt. Scroll-Handler laufen vor
//   dem Paint, der Überschuss wird also nie sichtbar - optisch bleibt die
//   Seite einfach exakt dort stehen.
// - Die Rest-Trägheit der auslösenden Geste (weitere Wheel-Events ohne
//   Pause) wird geschluckt; jede trotzdem durchgesickerte Positionsänderung
//   (Tastatur, Scrollbar) wird sofort zurückgesetzt.
// - Gelöst wird der Stopp durch eine NEUE Abwärts-Geste - erkannt an einer
//   Pause seit dem letzten Wheel-Event ODER an einem Delta-Spike mitten in
//   abklingender Trägheit. Keine Mindesthaltezeit: wer direkt weiter will,
//   flickt einfach erneut. Hochscrollen löst immer sofort.
export function useJourneyScrollLock(cardIds: readonly string[], enabled: boolean) {
  useEffect(() => {
    if (!enabled || window.innerWidth < MIN_VIEWPORT_WIDTH) return;

    let points: number[] = [];
    let consumed: boolean[] = [];
    let lock: { y: number; engagedAt: number } | null = null;
    let lastWheelAt = 0;
    let lastWheelDelta = 0;
    let lastY = window.scrollY;

    function remeasure() {
      points = measureLockPoints(cardIds);
      consumed = points.map((_, i) => consumed[i] ?? false);
    }
    remeasure();
    const timeouts = [100, 500, 1500].map((delay) => window.setTimeout(remeasure, delay));
    window.addEventListener("resize", remeasure);

    function handleWheel(event: WheelEvent) {
      const now = performance.now();
      const delta = event.deltaY;

      if (lock) {
        if (delta < 0) {
          // Zurückscrollen ist immer frei - Stopp sofort lösen.
          lock = null;
          lastWheelAt = now;
          lastWheelDelta = 0;
          return;
        }

        const isNewGestureByPause = now - lastWheelAt >= WHEEL_GESTURE_GAP_MS;
        const isNewGestureBySpike =
          Math.abs(delta) >= WHEEL_SPIKE_MIN_DELTA &&
          Math.abs(delta) > Math.abs(lastWheelDelta) * WHEEL_SPIKE_FACTOR;
        const heldTooLong = now - lock.engagedAt >= LOCK_MAX_HOLD_MS;

        if (isNewGestureByPause || isNewGestureBySpike || heldTooLong) {
          lock = null;
        } else {
          event.preventDefault();
        }
      }

      lastWheelAt = now;
      lastWheelDelta = delta;
    }

    function handleScroll() {
      const curr = window.scrollY;

      if (lock) {
        // Jede Positionsänderung wird noch vor dem Paint zurückgesetzt -
        // die Seite steht optisch felsenfest auf dem Lock-Punkt.
        if (curr !== lock.y) {
          scrollToInstant(lock.y);
        }
        lastY = lock.y;
        return;
      }

      if (curr > lastY) {
        for (let i = 0; i < points.length; i++) {
          if (!consumed[i] && lastY < points[i] && curr >= points[i]) {
            consumed[i] = true;
            lock = { y: points[i], engagedAt: performance.now() };
            // Sofort exakt auf den Punkt setzen - der Überschuss dieses
            // Scroll-Events wird nie gezeichnet.
            scrollToInstant(points[i]);
            lastY = points[i];
            return;
          }
        }
      } else if (curr < lastY) {
        // Wer wieder deutlich über einen Punkt hochscrollt, soll beim
        // nächsten Runterscrollen erneut einrasten.
        for (let i = 0; i < points.length; i++) {
          if (consumed[i] && curr < points[i] - RELOCK_MARGIN_PX) {
            consumed[i] = false;
          }
        }
      }
      lastY = curr;
    }

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      timeouts.forEach(window.clearTimeout);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [enabled, cardIds]);
}
