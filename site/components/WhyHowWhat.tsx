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
    body: [
      "Wir erleben es jeden Tag aus nächster Nähe: In den Klassenzimmern sitzen junge Menschen mit guten Gedanken, starker Logik und großem Potenzial. Aber wenn dann die nächste Arbeit zurückgegeben wird, steht unten drunter eine Note, die nicht ihr Wissen zeigt, sondern nur ihre Unsicherheit in Rechtschreibung, Grammatik, Zeichensetzung aber vor allem auch im Vokabular und Ausdruck. Das ist nicht nur ungerecht. Es raubt Selbstbewusstsein und bremst Zukunftschancen aus. Und das war der Moment, der uns bewegt hat: Wir müssen das ändern. Wir haben FehlerFix entwickelt, weil wir uns nicht damit abfinden können, dass Sprache zur Barriere wird. Wir wollten auch nicht einfach irgendeine App bauen, die stumm rote Striche zieht. Wir wollten eine echte Stütze schaffen. Wie ein Werkzeug, das Lernenden im Schulalltag, in Förderkursen und auf ihrem gesamten Lebensweg die Sicherheit zurückgibt, die sie verdienen.",
    ],
  },
  {
    id: "wie",
    border: "border-blue/40",
    eyebrow: "Wie",
    title: "Wie FehlerFix funktioniert",
    body: [
      "FehlerFix liest deine Handschrift aus drei von dir geschriebenen Ausgangstexten. Zusätzlich kannst du auch Klassenarbeiten, oder andere von dir geschriebene Texte hochladen. Die App analysiert diese und erstellt ein Fehlerprofil. Basierend auf diesem bekommst du genau auf dich zugeschnittene Übungen, deinen individuellen Lernpfad und eine Vokabelliste mit Wörtern, die du häufig falsch schreibst. Der integrierte KI-Algorithmus passt sich an dich und deine Fähigkeiten an und entwickelt sich mit dir und deinem Fortschritt weiter, so dass du dich bestens weiterentwickeln kannst.",
    ],
  },
  {
    id: "was",
    border: "border-green/50",
    eyebrow: "Was",
    title: "Was FehlerFix konkret ist",
    body: [
      "Rechtschreibung wird oft unterschätzt, dabei entscheidet sie täglich darüber, wie man wahrgenommen wird. FehlerFix ist die erste App, die Rechtschreibung, Grammatik, Zeichensetzung und Ausdruck nicht nur korrigiert, sondern wirklich versteht, wie du lernst. Für Tablet und Stift entwickelt, wächst FehlerFix mit dir – von der dritten Klasse bis zum Abitur. Kein starres Programm, sondern ein Lernbegleiter, der sich an dich anpasst, nicht umgekehrt. Mit FehlerFix merkt man schnell, wie die eigene Rechtschreibung sich spürbar verbessert und wie aus echten Schwächen messbare Stärken werden. Man wird sicherer, klarer, und das zeigt sich in jedem Text, den man schreibt.",
    ],
  },
];

export function WhyHowWhat() {
  return (
    <section className="relative px-6 pt-20 pb-20 sm:pt-28 sm:pb-28 md:pb-[24rem]">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 md:gap-[21rem]">
        {CARDS.map((card) => (
          <JourneyCardReveal
            key={card.id}
            id={card.id}
            className={
              CARD_SIDE[card.id] === "left"
                ? "scroll-mt-24 md:mr-auto md:w-[77%]"
                : "scroll-mt-24 md:ml-auto md:w-[77%]"
            }
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
              <div className="mt-4 space-y-4 text-lg leading-relaxed text-ink/70">
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
