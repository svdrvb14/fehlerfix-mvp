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

export function PressCarousel() {
  return (
    <section id="presse" className="relative scroll-mt-24 py-16 sm:py-20">
      <ScrollReveal className="px-6 text-center">
        <h2 className="text-balance font-poppins text-3xl font-bold text-ink sm:text-4xl">
          Presse &amp; Stimmen
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-lg text-ink/70">
          Was andere über FehlerFix sagen.
        </p>
      </ScrollReveal>

      <div className="snap-carousel mt-10 flex gap-6 overflow-x-auto px-6 pb-4 sm:justify-center">
        {PRESS_ITEMS.map((item) => (
          <div
            key={item.source}
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
