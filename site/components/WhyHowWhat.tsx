import { ScrollReveal } from "./ScrollReveal";

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
    body: "Handschrift erkennen: FehlerFix liest, was mit dem Apple Pencil aufs iPad geschrieben wird. Fehler analysieren: eine KI erkennt Rechtschreib-, Grammatik- und Zeichensetzungsfehler im Text. Regel erklären: statt nur zu korrigieren, erklärt FehlerFix die Regel dahinter – verständlich und auf das jeweilige Fehlerprofil zugeschnitten.",
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
    <section className="relative px-6 py-20 sm:py-28">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        {CARDS.map((card, index) => (
          <ScrollReveal key={card.id} delay={index * 0.08}>
            <div
              id={card.id}
              className={`scroll-mt-24 rounded-3xl border-2 bg-white/90 p-8 shadow-[0_10px_40px_rgba(0,0,0,0.06)] backdrop-blur-sm sm:p-10 ${card.border}`}
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
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
