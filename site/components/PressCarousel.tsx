"use client";

import { useEffect, useRef } from "react";
import { ScrollReveal } from "./ScrollReveal";

const PRESS_ITEMS = [
  {
    quote:
      "„Es ist eine exzellente Idee, dass die anvisierte App nicht nur Fehler markiert, sondern diese auch verständlich erklärt.“",
    source: "Sprachwissenschaftler",
  },
  {
    quote:
      "„FehlerFix hat das Potenzial, bestehende erfolgreiche Modelle wie GoStudent, Studienkreis etc. abzulösen – daher kann das ein spannendes Investment für einen Venture Capital Fund sein!“",
    source: "VC-Investor, TX Ventures AG, Zürich",
  },
  {
    quote:
      "„Ich würde mir die App runterladen, da ich einen Verdacht auf LRS habe. Es würde mein Leben um Einiges erleichtern.“",
    source: "Schülerin",
  },
  {
    quote:
      "„Mir gefällt, dass mit Hilfe von KI individuellere Förderung möglich gemacht wird, als mit herkömmlichen Lehr‑/Lernmitteln!“",
    source: "Lehrerin",
  },
];

// Drei Kopien statt einer: der Nutzer soll frei (auch per Hand) in beide
// Richtungen durchscrollen können, ohne je an einem Rand hängenzubleiben.
// Sobald die Scroll-Position aus der mittleren Kopie heraus in eine der
// äußeren driftet - egal ob durch den Auto-Advance oder manuelles Scrollen -
// wird sie unsichtbar (ohne Animation) um genau eine Satzbreite zurück in
// die Mitte gesetzt; da alle drei Kopien identisch sind, ist der Sprung
// nicht sichtbar und es fühlt sich endlos an.
const LOOP_ITEMS = [...PRESS_ITEMS, ...PRESS_ITEMS, ...PRESS_ITEMS];

// 20rem Kartenbreite (320px) + 1.5rem Abstand (24px), siehe Tailwind-Klassen
// unten – muss synchron bleiben, falls die Kartengröße geändert wird.
const CARD_STEP_PX = 344;
const SET_WIDTH_PX = PRESS_ITEMS.length * CARD_STEP_PX;
const STEP_INTERVAL_MS = 10000;

export function PressCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // Start in der mittleren Kopie, damit von Anfang an in beide
    // Richtungen Platz zum Weiterscrollen ist.
    track.scrollLeft = SET_WIDTH_PX;

    function wrapIfNeeded() {
      if (!track) return;
      if (track.scrollLeft < SET_WIDTH_PX * 0.5) {
        track.scrollLeft += SET_WIDTH_PX;
      } else if (track.scrollLeft > SET_WIDTH_PX * 1.5) {
        track.scrollLeft -= SET_WIDTH_PX;
      }
    }

    track.addEventListener("scroll", wrapIfNeeded, { passive: true });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return () => track.removeEventListener("scroll", wrapIfNeeded);
    }

    let intervalId: number | undefined;

    function advance() {
      track!.scrollTo({ left: track!.scrollLeft + CARD_STEP_PX, behavior: "smooth" });
    }

    function start() {
      intervalId = window.setInterval(advance, STEP_INTERVAL_MS);
    }
    function stop() {
      if (intervalId) window.clearInterval(intervalId);
    }

    start();
    track.addEventListener("mouseenter", stop);
    track.addEventListener("mouseleave", start);

    return () => {
      stop();
      track.removeEventListener("scroll", wrapIfNeeded);
      track.removeEventListener("mouseenter", stop);
      track.removeEventListener("mouseleave", start);
    };
  }, []);

  return (
    <section id="presse" className="relative scroll-mt-24 py-16 sm:py-20">
      <ScrollReveal className="px-6 text-center">
        <h2 className="text-balance font-poppins text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Presse &amp; Stimmen
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-lg text-ink/70">
          Was andere über FehlerFix sagen.
        </p>
      </ScrollReveal>

      <div
        ref={trackRef}
        className="snap-carousel mt-10 flex gap-6 overflow-x-auto px-6 pb-4"
      >
        {LOOP_ITEMS.map((item, index) => (
          <div
            key={`${item.source}-${index}`}
            className="w-[20rem] shrink-0 snap-center rounded-3xl border border-ink/10 bg-white p-7 shadow-[0_10px_30px_rgba(0,0,0,0.05)]"
          >
            <p className="text-lg leading-relaxed text-ink/80">{item.quote}</p>
            <p className="mt-4 text-sm font-semibold text-ink/50">{item.source}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
