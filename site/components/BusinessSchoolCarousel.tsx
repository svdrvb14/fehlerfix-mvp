import { ScrollReveal } from "./ScrollReveal";

// Echte Fotos vom Deutschlandfinale (Camera Roll), chronologisch sortiert.
const PHOTO_COUNT = 23;
const PHOTOS = Array.from({ length: PHOTO_COUNT }, (_, i) => `/business-school-${i + 1}.jpg`);

// Für eine nahtlose Endlos-Schleife wird das Array einmal dupliziert; die
// CSS-Animation verschiebt genau um -50% der Gesamtbreite.
const LOOP_PHOTOS = [...PHOTOS, ...PHOTOS];

// Tempo konstant halten, unabhängig von der Fotoanzahl: die Animation legt
// bei -50% Verschiebung immer die Breite eines einzelnen Fotosatzes zurück,
// daher skaliert die Dauer linear mit der Fotoanzahl statt fix zu sein.
const SECONDS_PER_PHOTO = 5.3;
const MARQUEE_DURATION = `${(PHOTO_COUNT * SECONDS_PER_PHOTO).toFixed(1)}s`;

export function BusinessSchoolCarousel() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-20">
      <ScrollReveal className="px-6 text-center">
        <h2 className="text-balance font-poppins text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Business@School
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-lg text-ink/70">
          Impressionen vom Wettbewerb, bei dem FehlerFix 2026 gewonnen hat.
        </p>
      </ScrollReveal>

      <div className="mt-10 overflow-hidden">
        <div
          className="marquee-track flex w-max gap-6"
          style={{ animationDuration: MARQUEE_DURATION }}
        >
          {LOOP_PHOTOS.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className="h-48 w-72 shrink-0 overflow-hidden rounded-2xl bg-ink/5 shadow-md sm:h-56 sm:w-80"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt="Foto vom Business@School-Deutschlandfinale"
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
