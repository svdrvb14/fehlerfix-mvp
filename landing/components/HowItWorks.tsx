import { AccentDot, BackgroundBlob } from "./BackgroundBlob";
import { ScrollReveal } from "./ScrollReveal";
import { BookIcon, PencilIcon, SparkleIcon } from "./StepIcons";

const steps = [
  {
    icon: PencilIcon,
    color: "text-blue",
    title: "Handschrift erkennen",
    text: "Dein Kind schreibt ganz normal mit dem Apple Pencil auf dem iPad – FehlerFix liest die Handschrift live mit.",
  },
  {
    icon: SparkleIcon,
    color: "text-coral",
    title: "Fehler analysieren",
    text: "Eine KI erkennt Rechtschreibfehler im geschriebenen Text und ordnet sie der passenden Regel zu.",
  },
  {
    icon: BookIcon,
    color: "text-green",
    title: "Regel erklären",
    text: "Statt nur rot anzustreichen, erklärt FehlerFix verständlich, warum ein Wort so geschrieben wird.",
  },
];

export function HowItWorks() {
  return (
    <section className="relative overflow-hidden px-6 py-24">
      <BackgroundBlob
        color="coral"
        className="-left-32 bottom-0 h-[22rem] w-[22rem]"
        speed={0.1}
      />
      <AccentDot color="blue" className="right-16 top-6 h-2.5 w-2.5" />
      <AccentDot color="green" className="right-6 top-20 h-2 w-2" />

      <div className="mx-auto max-w-6xl">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-poppins text-3xl font-bold text-ink sm:text-4xl">
            So funktioniert&apos;s
          </h2>
          <p className="mt-4 text-lg text-ink/70">
            Drei Schritte, vom handgeschriebenen Wort bis zum echten
            Aha-Moment.
          </p>
        </ScrollReveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {steps.map((step, index) => (
            <ScrollReveal key={step.title} delay={index * 0.12}>
              <div className="h-full rounded-3xl border border-ink/5 bg-white p-8 shadow-[0_4px_30px_rgba(0,0,0,0.04)]">
                <div className={`relative h-12 w-12 ${step.color}`}>
                  <step.icon className="h-full w-full" />
                </div>
                <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-ink/40">
                  Schritt {index + 1}
                </p>
                <h3 className="mt-2 font-poppins text-xl font-bold text-ink">
                  {step.title}
                </h3>
                <p className="mt-3 leading-relaxed text-ink/70">{step.text}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
