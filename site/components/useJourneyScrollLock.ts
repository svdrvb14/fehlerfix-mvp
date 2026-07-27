"use client";

import { useEffect } from "react";
import {
  centerLockY,
  LOCK_MAX_HOLD_MS,
  LOCK_MIN_HOLD_MS,
  RELOCK_MARGIN_PX,
  WHEEL_GESTURE_GAP_MS,
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

// Echtes Scroll-Einrasten. Überschreitet der Scroll beim Runterscrollen einen
// Lock-Punkt (Kartenmitte = Bildschirmmitte), wird die Position exakt dorthin
// gesetzt und dort festgehalten: jedes weitere Scroll-Event wird auf den
// Lock-Punkt zurückkorrigiert, Wheel-Events werden geschluckt. Gelöst wird der
// Lock NICHT über einen Timer, sondern erst durch eine NEUE Abwärts-Geste –
// erkennbar an einer Pause seit dem letzten Wheel-Event. Die Rest-Trägheit
// der Geste, die das Einrasten ausgelöst hat, prallt also am Lock ab; erst
// wer danach erneut scrollt, kommt weiter. Hochscrollen löst den Lock sofort.
export function useJourneyScrollLock(cardIds: readonly string[], enabled: boolean) {
  useEffect(() => {
    if (!enabled || window.innerWidth < MIN_VIEWPORT_WIDTH) return;

    let points: number[] = [];
    let consumed: boolean[] = [];
    let lock: { y: number; engagedAt: number } | null = null;
    let lastWheelAt = 0;
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
      if (lock) {
        if (event.deltaY < 0) {
          // Zurückscrollen ist immer frei – Lock sofort lösen.
          lock = null;
          lastWheelAt = now;
          return;
        }
        const heldLongEnough = now - lock.engagedAt >= LOCK_MIN_HOLD_MS;
        const isNewGesture = now - lastWheelAt >= WHEEL_GESTURE_GAP_MS;
        const heldTooLong = now - lock.engagedAt >= LOCK_MAX_HOLD_MS;
        if ((heldLongEnough && isNewGesture) || heldTooLong) {
          lock = null;
        } else {
          event.preventDefault();
        }
      }
      lastWheelAt = now;
    }

    function handleScroll() {
      const curr = window.scrollY;

      if (lock) {
        // Während des Locks wird JEDE Positionsänderung (auch Tastatur oder
        // Scrollbar, die kein Wheel-Event erzeugen) hart zurückkorrigiert.
        if (Math.abs(curr - lock.y) > 0.5) {
          window.scrollTo({ top: lock.y, behavior: "auto" });
        }
        lastY = lock.y;
        return;
      }

      if (curr > lastY) {
        for (let i = 0; i < points.length; i++) {
          if (!consumed[i] && lastY < points[i] && curr >= points[i]) {
            consumed[i] = true;
            lock = { y: points[i], engagedAt: performance.now() };
            window.scrollTo({ top: points[i], behavior: "auto" });
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
