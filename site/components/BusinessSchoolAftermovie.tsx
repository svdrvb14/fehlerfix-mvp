"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollReveal } from "./ScrollReveal";

const YOUTUBE_VIDEO_ID = "T6p_il_IT9o";

export function BusinessSchoolAftermovie() {
  const containerRef = useRef<HTMLDivElement>(null);
  // Video erst laden, wenn man beim Scrollen tatsächlich vorbeikommt - vorher
  // gibt es keinen Thumbnail-mit-Play-Button-Zustand zu sehen, das Video
  // startet direkt (stumm, wegen Autoplay-Regeln der Browser) beim Erscheinen.
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative px-6 pb-16 sm:pb-20">
      <ScrollReveal className="mx-auto max-w-4xl text-center">
        <h2 className="text-balance font-poppins text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          business@school Aftermovie
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-lg text-ink/70">
          Die besten Momente vom Deutschlandfinale 2026 in Bewegtbild.
        </p>
      </ScrollReveal>

      <div
        ref={containerRef}
        className="mx-auto mt-10 aspect-video max-w-4xl overflow-hidden rounded-3xl bg-ink/5 shadow-[0_10px_40px_rgba(0,0,0,0.08)]"
      >
        {shouldLoad && (
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1&playsinline=1`}
            title="business@school Deutschlandfinale 2026 - Aftermovie"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
    </section>
  );
}
