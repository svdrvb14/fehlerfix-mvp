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
    body: "Gute Schülerinnen und Schüler verlieren jedes Jahr Punkte und Chancen durch Rechtschreibfehler – nicht, weil sie die Regeln nicht lernen könnten, sondern weil ihnen im Trubel des Schulalltags niemand die Zeit nimmt, sie richtig zu erklären. Ein rot angestrichenes Wort sagt: falsch. Es sagt nicht: warum.",
  },
  {
    id: "wie",
    border: "border-blue/40",
    eyebrow: "Wie",
    title: "Wie FehlerFix funktioniert",
    body: "FehlerFix liest deine Handschrift aus drei von dir geschriebenen Ausgangstexten. Zusätzlich kannst du auch Klassenarbeiten, oder andere von dir geschriebene Texte hochladen. Die App analysiert diese und erstellt ein Fehlerprofil. Basierend auf diesem bekommst du genau auf dich zugeschnittene Übungen, deinen individuellen Lernpfad und eine Vokabelliste mit Wörtern, die du häufig falsch schreibst. Der integrierte KI-Algorithmus passt sich an dich und deine Fähigkeiten an und entwickelt sich mit dir und deinem Fortschritt weiter, so dass du dich bestens weiterentwickeln kannst.",
  },
  {
    id: "was",
    border: "border-green/50",
    eyebrow: "Was",
    title: "Was FehlerFix konkret ist",
    body: "Eine App fürs iPad mit Apple Pencil, im gesamten DACH-Raum. FehlerFix läuft als Abo: unbegrenzte Übungen, Handschrifterkennung, Fehleranalyse mit Erklärung und ein persönlicher Fortschrittsverlauf, der zeigt, wie sich die Fehlerquote über die Zeit entwickelt.",
  },
];

export function WhyHowWhat() {
  return (
    <section className="relative px-6 pt-20 pb-20 sm:pt-28 sm:pb-28 md:pb-[40rem]">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 md:gap-[34rem]">
        {CARDS.map((card) => (
          <JourneyCardReveal
            key={card.id}
            id={card.id}
            className={
              CARD_SIDE[card.id] === "left"
                ? "scroll-mt-24 md:mr-auto md:w-[70%]"
                : "scroll-mt-24 md:ml-auto md:w-[70%]"
            }
          >
            <div
              className={`rounded-3xl border-2 bg-white/90 p-8 shadow-[0_10px_40px_rgba(0,0,0,0.06)] backdrop-blur-sm sm:p-10 ${card.border}`}
            >
              <p className="font-poppins text-sm font-bold uppercase tracking-wide text-ink/40">
                {card.eyebrow}
              </p>
              <h2 className="mt-2 text-balance font-poppins text-2xl font-bold text-ink sm:text-3xl">
                {card.title}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-ink/70">
                {card.body}
              </p>
            </div>
          </JourneyCardReveal>
        ))}
      </div>
    </section>
  );
}
