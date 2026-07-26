import { Wordmark } from "./Wordmark";

export function Hero() {
  return (
    <section id="top" className="relative px-6 pb-20 pt-14 sm:pt-20">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-balance font-poppins text-4xl font-bold leading-tight text-ink sm:text-5xl md:text-6xl">
          Rechtschreibung, die endlich Sinn ergibt.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-ink/70 sm:text-xl">
          <Wordmark className="font-semibold" /> erkennt Rechtschreibfehler
          direkt aus der Handschrift auf dem iPad – mit dem Apple Pencil
          geschrieben, von einer KI analysiert. Statt den Fehler nur rot
          anzustreichen, erklärt FehlerFix die Regel dahinter.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3">
          <a
            href="#preise"
            className="rounded-full bg-coral px-8 py-4 text-center font-semibold text-white shadow-md transition hover:bg-coral/90"
          >
            Jetzt abonnieren
          </a>
          <p className="text-sm text-ink/50">
            Fürs iPad · Klasse 3–13 · DACH-Raum
          </p>
        </div>
      </div>
    </section>
  );
}
