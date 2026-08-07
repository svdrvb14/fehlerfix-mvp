"use client";

import { useEffect, useRef } from "react";
import { ScrollReveal } from "./ScrollReveal";

// TODO: echte Presse-Zitate/Kommentare eintragen, sobald verfügbar.
const PRESS_ITEMS = [
  {
    quote:
      "„Eine App, die Rechtschreibfehler nicht nur markiert, sondern erklärt – genau das hat im Unterricht gefehlt.“",
    source: "Platzhalter-Quelle 1",
  },
  {
    quote:
      "„FehlerFix zeigt, wie KI im Klassenzimmer sinnvoll eingesetzt werden kann, statt Abkürzungen zu ermöglichen.“",
    source: "Platzhalter-Quelle 2",
  },
  {
    quote:
      "„Der Sieg bei Business@School war verdient – ein Produkt mit echtem pädagogischen Mehrwert.“",
    source: "Platzhalter-Quelle 3",
  },
  {
    quote:
      "„Endlich versteht mein Kind, warum ein Wort falsch war – nicht nur, dass es falsch war.“",
    source: "Platzhalter-Stimme, Elternteil",
  },
  {
    quote:
      "„Handschrifterkennung mit Apple Pencil und KI-Fehleranalyse in einem – technisch beeindruckend umgesetzt.“",
    source: "Platzhalter-Quelle 5",
  },
];

// Für einen nahtlosen Loop wird die Liste einmal dupliziert; nach einem
// vollen Durchlauf springt der Scroll-Container unsichtbar (ohne Animation)
// zurück an den Anfang, weil Original und Duplikat identisch sind.
const LOOP_ITEMS = [...PRESS_ITEMS, ...PRESS_ITEMS];

// 20rem Kartenbreite (320px) + 1.5rem Abstand (24px), siehe Tailwind-Klassen
// unten – muss synchron bleiben, falls die Kartengröße geändert wird.
const CARD_STEP_PX = 344;
const STEP_INTERVAL_MS = 10000;

export function PressCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let intervalId: number | undefined;

    function advance() {
      const next = stepRef.current + 1;
      track!.scrollTo({ left: next * CARD_STEP_PX, behavior: "smooth" });

      if (next >= PRESS_ITEMS.length) {
        window.setTimeout(() => {
          track!.scrollTo({ left: 0, behavior: "auto" });
          stepRef.current = 0;
        }, 600);
      } else {
        stepRef.current = next;
      }
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
