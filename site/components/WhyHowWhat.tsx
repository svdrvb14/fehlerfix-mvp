import { JourneyCardReveal } from "./JourneyCardReveal";

// Bestimmt sowohl den Versatz der Karten (links/rechts) als auch, an
// welcher oberen Ecke die JourneyPath-Verbindungslinie samt Stift-Icon
// andockt (siehe components/JourneyPath.tsx).
export const CARD_SIDE: Record<string, "left" | "right"> = {
  warum: "left",
  wie: "right",
  was: "left",
};

const CARDS = [
  {
    id: "warum",
    border: "border-coral/40",
    eyebrow: "Warum",
    title: "Warum es FehlerFix gibt",
    shortBody: [
      "Junge Menschen mit großem Potenzial werden oft nur nach ihrer Rechtschreibung und ihrem Ausdruck beurteilt, nicht nach ihrem Wissen – ungerecht und bremsend. Deshalb gibt es FehlerFix: eine echte Stütze statt stummer Rotstift.",
    ],
    body: [
      "In Klassenzimmern sitzen junge Menschen mit großem Potenzial. Doch die nächste Note zeigt oft nicht ihr Wissen, sondern nur ihre Unsicherheit in Rechtschreibung, Grammatik, Zeichensetzung, Vokabular und Ausdruck. Das ist ungerecht, es raubt Selbstbewusstsein und bremst Zukunftschancen. Deshalb haben wir FehlerFix entwickelt: keine App, die stumm rote Striche zieht, sondern eine echte Stütze, die im Schulalltag die Sicherheit zurückgibt, die sie verdienen.",
    ],
  },
  {
    id: "wie",
    border: "border-blue/40",
    eyebrow: "Wie",
    title: "Wie FehlerFix funktioniert",
    shortBody: [
      "FehlerFix liest deine Handschrift aus eigenen Texten und erstellt dein Fehlerprofil. Daraus entstehen passgenaue Übungen, dein Lernpfad und eine Vokabelliste. Der KI-Algorithmus entwickelt sich mit deinem Fortschritt weiter.",
    ],
    body: [
      "FehlerFix liest deine Handschrift aus drei von dir geschriebenen Ausgangstexten - zusätzlich kannst du Klassenarbeiten oder andere Texte hochladen. Die App analysiert diese und erstellt ein Fehlerprofil. Daraus bekommst du genau auf dich zugeschnittene Übungen, deinen individuellen Lernpfad und eine Vokabelliste mit Wörtern, die du häufig falsch schreibst. Der integrierte KI-Algorithmus passt sich an dich an und entwickelt sich mit deinem Fortschritt weiter.",
    ],
  },
  {
    id: "was",
    border: "border-green/50",
    eyebrow: "Was",
    title: "Was FehlerFix konkret ist",
    shortBody: [
      "FehlerFix korrigiert nicht nur, sondern versteht, wie du lernst. Für Tablet und Stift entwickelt, wächst die App von der dritten Klasse bis zum Abitur mit dir mit. So werden aus echten Schwächen messbare Stärken.",
    ],
    body: [
      "Rechtschreibung wird oft unterschätzt, dabei entscheidet sie täglich, wie man wahrgenommen wird. FehlerFix ist die erste App, die Rechtschreibung, Grammatik, Zeichensetzung und Ausdruck nicht nur korrigiert, sondern wirklich versteht, wie du lernst. Für Tablet und Stift entwickelt, wächst FehlerFix mit dir – von der dritten Klasse bis zum Abitur. Kein starres Programm, sondern ein Lernbegleiter, der sich an dich anpasst. So werden aus echten Schwächen messbare Stärken – man wird sicherer, klarer, in jedem Text, den man schreibt.",
    ],
  },
];

export function WhyHowWhat() {
  return (
    <section className="relative px-6 pt-20 pb-20 sm:pt-28 sm:pb-28">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 md:gap-[14.5rem]">
        {CARDS.map((card) => (
          <JourneyCardReveal
            key={card.id}
            id={card.id}
            className={`scroll-mt-24 md:w-[77%] ${
              CARD_SIDE[card.id] === "left" ? "md:mr-auto" : "md:ml-auto"
            } ${card.id === "warum" ? "md:mt-10" : ""}`}
          >
            <div
              className={`rounded-3xl border-2 bg-white/90 p-8 shadow-[0_10px_40px_rgba(0,0,0,0.06)] backdrop-blur-sm sm:p-10 ${card.border}`}
            >
              <p className="font-poppins text-sm font-bold uppercase tracking-wide text-ink/40">
                {card.eyebrow}
              </p>
              <h2 className="mt-2 text-balance font-poppins text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {card.title}
              </h2>
              <div className="mt-4 space-y-4 text-lg leading-relaxed text-ink/70 md:hidden">
                {card.shortBody.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
              <div className="mt-4 hidden space-y-4 text-lg leading-relaxed text-ink/70 md:block">
                {card.body.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>
          </JourneyCardReveal>
        ))}
      </div>
    </section>
  );
}
