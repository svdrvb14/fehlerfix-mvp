"use client";

import { useEffect, useRef } from "react";
import { centerLockY, LOCK_COOLDOWN_MS } from "./journeyTiming";

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

// Echtes Scroll-Einrasten: sobald der Scroll beim Runterscrollen einen der
// Lock-Punkte (Kartenmitte = Bildschirmmitte) überschreitet, wird die
// Position exakt dorthin korrigiert und weiteres Scrollen kurz blockiert.
// Erst nach Ablauf des Cooldowns (bzw. mit erneutem Scrollen danach) geht es
// normal weiter.
export function useJourneyScrollLock(cardIds: readonly string[], enabled: boolean) {
  const pointsRef = useRef<number[]>([]);
  const lockedRef = useRef(false);
  const lastScrollY = useRef(0);
  const cooldownTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || window.innerWidth < MIN_VIEWPORT_WIDTH) return;

    function remeasure() {
      pointsRef.current = measureLockPoints(cardIds);
    }
    remeasure();
    const timeouts = [100, 500, 1500].map((delay) => window.setTimeout(remeasure, delay));
    window.addEventListener("resize", remeasure);

    lastScrollY.current = window.scrollY;

    function handleWheel(event: WheelEvent) {
      if (lockedRef.current) {
        event.preventDefault();
      }
    }

    function handleScroll() {
      if (lockedRef.current) return;
      const prev = lastScrollY.current;
      const curr = window.scrollY;

      if (curr <= prev) {
        lastScrollY.current = curr;
        return;
      }

      for (const point of pointsRef.current) {
        if (prev < point && curr >= point) {
          lockedRef.current = true;
          window.scrollTo({ top: point, behavior: "auto" });
          lastScrollY.current = point;
          if (cooldownTimer.current) window.clearTimeout(cooldownTimer.current);
          cooldownTimer.current = window.setTimeout(() => {
            lockedRef.current = false;
            lastScrollY.current = window.scrollY;
          }, LOCK_COOLDOWN_MS);
          return;
        }
      }
      lastScrollY.current = curr;
    }

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      timeouts.forEach(window.clearTimeout);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("scroll", handleScroll);
      if (cooldownTimer.current) window.clearTimeout(cooldownTimer.current);
    };
  }, [enabled, cardIds]);
}
