import { AccentDot, BackgroundBlob } from "./BackgroundBlob";
import { ScrollReveal } from "./ScrollReveal";
import { WaitlistForm } from "./WaitlistForm";

export function SecondCta() {
  return (
    <section className="relative overflow-hidden px-6 py-24">
      <BackgroundBlob
        color="coral"
        className="-right-28 top-1/2 h-[20rem] w-[20rem] -translate-y-1/2"
        speed={0.11}
      />
      <AccentDot color="blue" className="left-16 bottom-8 h-3 w-3" />

      <ScrollReveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-balance font-poppins text-3xl font-bold text-ink sm:text-4xl">
          Nicht verpassen
        </h2>
        <p className="mt-4 text-lg text-ink/70">
          Trag dich jetzt ein und sei unter den Ersten, die FehlerFix
          ausprobieren, sobald es startet.
        </p>
        <div className="mx-auto mt-8 max-w-lg">
          <WaitlistForm />
          <p className="mt-4 text-sm text-ink/50">
            Kein Newsletter. Eine Mail, sobald FehlerFix live geht.
          </p>
        </div>
      </ScrollReveal>
    </section>
  );
}
