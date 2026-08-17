"use client";

import { useEffect } from "react";
import {
  centerLockY,
  LOCK_MAX_HOLD_MS,
  RELOCK_MARGIN_PX,
  WHEEL_GESTURE_GAP_MS,
  WHEEL_SPIKE_FACTOR,
  WHEEL_SPIKE_MIN_DELTA,
  WHEEL_SPIKE_WINDOW_MS,
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
    // Ein Klick auf einen Anker-Link (Menü, "Jetzt abonnieren" oben, o.ä.)
    // löst dank scroll-behavior:smooth eine mehrere hundert Millisekunden
    // lange Scroll-Animation aus, die exakt wie eine Wheel-Geste als
    // "scroll"-Events bei uns ankommt. Ohne diese Unterscheidung würde der
    // erste dabei gekreuzte Lock-Punkt greifen und die Zielnavigation mitten
    // auf der ersten Karte festhalten. Während einer solchen Navigation wird
    // deshalb kein neuer Stopp eingerastet - erkannt am Klick, beendet
    // sobald die Scroll-Events eine kurze Weile ausbleiben (funktioniert
    // ohne Abhängigkeit vom noch nicht überall unterstützten
    // "scrollend"-Event).
    let navigating = false;
    let navigatingIdleTimer: number | undefined;

    function beginNavigation() {
      navigating = true;
      lock = null;
      if (navigatingIdleTimer) window.clearTimeout(navigatingIdleTimer);
      navigatingIdleTimer = window.setTimeout(endNavigation, 250);
    }
    function endNavigation() {
      navigating = false;
      lastY = window.scrollY;
    }
    function handleClick(event: MouseEvent) {
      const target = event.target as Element | null;
      const anchor = target?.closest?.("a[href]");
      const href = anchor?.getAttribute("href");
      if (href && href.includes("#")) {
        beginNavigation();
      }
    }
    document.addEventListener("click", handleClick);

    // Kommt man per Browser-"Zurück" auf die Seite zurück (z.B. vom
    // Stripe-Checkout), versucht der Browser selbst, die vorherige
    // Scroll-Position wiederherzustellen - und tut das messbar animiert
    // statt in einem Sprung. "pageshow" fängt den Fall ab, in dem die Seite
    // unverändert aus dem bfcache auftaut (unser Listener hängt dann schon
    // von VOR dem Einfrieren). Bei einem echten Neuladen dagegen ist die
    // Wiederherstellung oft schon im Gange, BEVOR React überhaupt gemountet
    // und dieser Effect gelaufen ist - "pageshow" käme dann zu spät, wir
    // würden das Event schlicht verpassen. Deshalb startet der Effect
    // zusätzlich grundsätzlich im "navigating"-Zustand: die ersten 250ms
    // nach jedem Mount (aus welchem Grund auch immer - erster Aufruf,
    // Neuladen, Zurück-Navigation) rastet nichts ein, sondern erst sobald
    // der Scroll für eine kurze Weile zur Ruhe kommt. Ohne all das würde
    // unser Lock den ERSTEN dabei gekreuzten Punkt sofort einrasten und die
    // Wiederherstellung mitten auf irgendeiner Karte abwürgen, statt an der
    // eigentlich gespeicherten Position (z.B. bei "Preise") anzukommen.
    beginNavigation();
    function handlePageShow() {
      beginNavigation();
    }
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", beginNavigation);
    // Zeitstempel + Betrag der letzten Wheel-Deltas, für die
    // Spike-Erkennung. Nur ein gleitendes Zeitfenster (statt der ganzen
    // Geste oder nur des letzten Samples), damit die Referenz mit der
    // tatsächlich abklingenden Trägheit mitschrumpft: ein kräftiger
    // Ausgangs-Flick soll nicht auf Dauer die Latte für "neue Geste"
    // hochhalten, aber ein einzelnes zufällig winziges Sample direkt am
    // Lock-Punkt soll auch nicht die ganze Referenz auf null reißen.
    let recentDeltas: { t: number; abs: number }[] = [];
    let lastY = window.scrollY;

    function recentPeak(now: number): number {
      recentDeltas = recentDeltas.filter((s) => now - s.t <= WHEEL_SPIKE_WINDOW_MS);
      let peak = 0;
      for (const s of recentDeltas) peak = Math.max(peak, s.abs);
      return peak;
    }

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

      // Eine Pause seit dem letzten Wheel-Event beendet die bisherige Geste
      // - unabhängig davon, ob gerade ein Stopp aktiv ist.
      if (now - lastWheelAt >= WHEEL_GESTURE_GAP_MS) {
        lock = null;
      }

      if (lock) {
        if (delta < 0) {
          // Zurückscrollen ist immer frei - Stopp sofort lösen.
          lock = null;
        } else {
          const peak = recentPeak(now);
          const isSpike =
            Math.abs(delta) >= WHEEL_SPIKE_MIN_DELTA && Math.abs(delta) > peak * WHEEL_SPIKE_FACTOR;
          const heldTooLong = now - lock.engagedAt >= LOCK_MAX_HOLD_MS;

          if (isSpike || heldTooLong) {
            lock = null;
          } else {
            event.preventDefault();
          }
        }
      }

      recentDeltas.push({ t: now, abs: Math.abs(delta) });
      lastWheelAt = now;
    }

    function handleScroll() {
      const curr = window.scrollY;

      if (navigating) {
        // Kein Stopp während einer Link-/Button-ausgelösten Navigation -
        // dafür jeden dabei passierten Lock-Punkt als "schon gesehen"
        // markieren, damit direkt danach kein überraschender Stopp beim
        // nächsten normalen Scrollen auftaucht.
        if (curr > lastY) {
          for (let i = 0; i < points.length; i++) {
            if (!consumed[i] && lastY < points[i] && curr >= points[i]) {
              consumed[i] = true;
            }
          }
        }
        lastY = curr;
        if (navigatingIdleTimer) window.clearTimeout(navigatingIdleTimer);
        navigatingIdleTimer = window.setTimeout(endNavigation, 250);
        return;
      }

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
      if (navigatingIdleTimer) window.clearTimeout(navigatingIdleTimer);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("click", handleClick);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", beginNavigation);
    };
  }, [enabled, cardIds]);
}
