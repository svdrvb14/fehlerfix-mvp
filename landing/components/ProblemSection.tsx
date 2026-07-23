import { BackgroundBlob, AccentDot } from "./BackgroundBlob";
import { ScrollReveal } from "./ScrollReveal";
import { Wordmark } from "./Wordmark";

export function ProblemSection() {
  return (
    <section className="relative overflow-hidden px-6 py-24">
      <BackgroundBlob
        color="blue"
        className="-right-40 top-10 h-[24rem] w-[24rem]"
        speed={0.1}
      />
      <AccentDot color="coral" className="left-10 bottom-10 h-3 w-3" />

      <div className="mx-auto max-w-3xl">
        <ScrollReveal>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue">
            Eine ganz normale Klassenarbeit
          </p>
          <h2 className="mt-3 text-balance font-poppins text-3xl font-bold text-ink sm:text-4xl">
            Finn hat verstanden, worum es geht. Die Note sagt etwas anderes.
          </h2>
          <div className="mt-6 space-y-5 text-lg leading-relaxed text-ink/70">
            <p>
              Finn ist zwölf, liest gerne und hat in Deutsch die besten Ideen
              der Klasse. Wenn er einen Aufsatz zurückbekommt, ist die Seite
              trotzdem voller roter Kreise – nicht weil der Inhalt falsch
              wäre, sondern weil &bdquo;dass&ldquo; und &bdquo;das&ldquo;,
              &bdquo;seid&ldquo; und &bdquo;seit&ldquo; ihm einfach nicht
              auseinanderhalten wollen.
            </p>
            <p>
              Unter dem Aufsatz steht: &bdquo;Rechtschreibung üben!&ldquo; Aber welche
              Regel er eigentlich vergessen hat, steht da nicht. Also übt er
              irgendetwas – und macht beim nächsten Mal wieder dieselben
              Fehler.
            </p>
            <p>
              Genau da setzt <Wordmark className="font-semibold" /> an: nicht
              nur zeigen, <em>dass</em> ein Fehler da ist, sondern erklären,{" "}
              <em>warum</em> – direkt an dem Wort, das Finn selbst mit dem
              Apple Pencil geschrieben hat.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
