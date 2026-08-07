"use client";

import { useEffect } from "react";
import {
  centerLockY,
  LOCK_MAX_HOLD_MS,
  LOCK_MIN_HOLD_MS,
  RELOCK_MARGIN_PX,
  SETTLE_ANIM_MS,
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

// Die Seite hat global scroll-behavior: smooth - behavior "auto" würde also
// jede Korrektur zur animierten Gleitfahrt machen, die mit nachfolgenden
// Korrekturen sichtbar oszilliert. Deshalb hier immer "instant".
function scrollToInstant(top: number) {
  window.scrollTo({ top, behavior: "instant" });
}

// Echtes Scroll-Einrasten. Überschreitet der Scroll beim Runterscrollen einen
// Lock-Punkt (Kartenmitte = Bildschirmmitte), gleitet die Position mit einer
// kurzen Ease-out-Animation exakt dorthin und wird dort festgehalten:
// Wheel-Events werden geschluckt, fremde Positionsänderungen zurückgesetzt.
// Gelöst wird der Lock NICHT über einen Timer, sondern erst durch eine NEUE
// Abwärts-Geste - erkennbar an einer Pause seit dem letzten Wheel-Event. Die
// Rest-Trägheit der Geste, die das Einrasten ausgelöst hat, prallt also am
// Lock ab; erst wer danach erneut scrollt, kommt weiter. Hochscrollen löst
// den Lock sofort.
export function useJourneyScrollLock(cardIds: readonly string[], enabled: boolean) {
  useEffect(() => {
    if (!enabled || window.innerWidth < MIN_VIEWPORT_WIDTH) return;

    let points: number[] = [];
    let consumed: boolean[] = [];
    let lock: { y: number; engagedAt: number } | null = null;
    let settleFrame: number | null = null;
    let lastWheelAt = 0;
    let lastY = window.scrollY;

    function remeasure() {
      points = measureLockPoints(cardIds);
      consumed = points.map((_, i) => consumed[i] ?? false);
    }
    remeasure();
    const timeouts = [100, 500, 1500].map((delay) => window.setTimeout(remeasure, delay));
    window.addEventListener("resize", remeasure);

    function cancelSettle() {
      if (settleFrame !== null) {
        window.cancelAnimationFrame(settleFrame);
        settleFrame = null;
      }
    }

    // Weiches Einrasten: statt hart auf den Lock-Punkt zu springen, gleitet
    // die Position vom Überschieß-Punkt mit Ease-out dorthin. Die dabei
    // entstehenden Scroll-Events erkennt handleScroll am laufenden Frame und
    // lässt sie in Ruhe - nichts kämpft gegen die Animation an.
    function settleTo(target: number) {
      cancelSettle();
      const from = window.scrollY;
      const dist = target - from;
      if (Math.abs(dist) < 1) {
        scrollToInstant(target);
        return;
      }
      const t0 = performance.now();
      function step() {
        if (!lock) {
          settleFrame = null;
          return;
        }
        const t = Math.min(1, (performance.now() - t0) / SETTLE_ANIM_MS);
        const eased = 1 - Math.pow(1 - t, 3);
        scrollToInstant(from + dist * eased);
        lastY = window.scrollY;
        settleFrame = t < 1 ? window.requestAnimationFrame(step) : null;
      }
      settleFrame = window.requestAnimationFrame(step);
    }

    function release() {
      lock = null;
      cancelSettle();
    }

    function handleWheel(event: WheelEvent) {
      const now = performance.now();
      if (lock) {
        if (event.deltaY < 0) {
          // Zurückscrollen ist immer frei - Lock sofort lösen.
          release();
          lastWheelAt = now;
          return;
        }
        const heldLongEnough = now - lock.engagedAt >= LOCK_MIN_HOLD_MS;
        const isNewGesture = now - lastWheelAt >= WHEEL_GESTURE_GAP_MS;
        const heldTooLong = now - lock.engagedAt >= LOCK_MAX_HOLD_MS;
        if ((heldLongEnough && isNewGesture) || heldTooLong) {
          release();
        } else {
          event.preventDefault();
        }
      }
      lastWheelAt = now;
    }

    function handleScroll() {
      const curr = window.scrollY;

      if (lock) {
        if (settleFrame !== null) {
          // Scroll-Event aus der eigenen Einrast-Animation - nicht anfassen.
          lastY = curr;
          return;
        }
        // Nach der Animation wird JEDE fremde Positionsänderung (Tastatur,
        // Scrollbar - erzeugen keine Wheel-Events) zurückgesetzt.
        if (Math.abs(curr - lock.y) > 0.5) {
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
            settleTo(points[i]);
            lastY = curr;
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
      cancelSettle();
    };
  }, [enabled, cardIds]);
}
