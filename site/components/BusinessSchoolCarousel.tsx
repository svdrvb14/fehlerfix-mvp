import { ScrollReveal } from "./ScrollReveal";

// Platzhalter-Fotos vom Business@School-Wettbewerb. Die Dateien existieren
// noch nicht in public/ – echte Fotos folgen und können einfach unter
// denselben Dateinamen abgelegt werden.
const PHOTOS = Array.from({ length: 6 }, (_, i) => `/business-school-${i + 1}.jpg`);

// Für eine nahtlose Endlos-Schleife wird das Array einmal dupliziert; die
// CSS-Animation verschiebt genau um -50% der Gesamtbreite.
const LOOP_PHOTOS = [...PHOTOS, ...PHOTOS];

export function BusinessSchoolCarousel() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-20">
      <ScrollReveal className="px-6 text-center">
        <h2 className="text-balance font-poppins text-3xl font-bold text-ink sm:text-4xl">
          Business@School
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-lg text-ink/70">
          Impressionen vom Wettbewerb, bei dem FehlerFix 2026 gewonnen hat.
        </p>
      </ScrollReveal>

      <div className="mt-10 overflow-hidden">
        <div className="marquee-track flex w-max gap-6">
          {LOOP_PHOTOS.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className="h-48 w-72 shrink-0 overflow-hidden rounded-2xl bg-ink/5 shadow-md sm:h-56 sm:w-80"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt="Foto vom Business@School-Wettbewerb"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
