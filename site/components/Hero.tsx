import { Wordmark } from "./Wordmark";

export function Hero() {
  return (
    <section id="top" className="relative px-6 pb-20 pt-14 sm:pt-20">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-balance font-poppins text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl sm:leading-[1.08] md:text-6xl md:leading-[1.08]">
          Rechtschreibung, die endlich Sinn ergibt.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-ink/70 sm:text-xl">
          <Wordmark className="font-semibold" /> erkennt Rechtschreibfehler,
          Grammatik und Zeichensetzung direkt aus der Handschrift. Die App
          korrigiert Texte, erstellt ein Fehlerprofil und entwickelt mit
          Hilfe eines maßgeschneiderten Algorithmus individuelle und genau
          auf dich zugeschnittene Übungen.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3">
          <a
            href="#preise"
            className="rounded-full bg-coral px-8 py-4 text-center font-semibold text-white shadow-md transition duration-150 hover:bg-coral/90 active:scale-[0.97]"
          >
            Jetzt abonnieren
          </a>
          <p id="hero-journey-start" className="text-sm text-ink/50">
            In wenigen Minuten startklar – für jedes Alter ab der zweiten Klasse
          </p>
        </div>
      </div>
    </section>
  );
}
