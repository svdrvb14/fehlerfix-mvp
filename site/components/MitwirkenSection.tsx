import { CONTRIBUTE_ITEMS, contributeMailtoHref } from "@/lib/contribute";
import { ScrollReveal } from "./ScrollReveal";

export function MitwirkenSection() {
  return (
    <section id="mitwirken" className="relative scroll-mt-24 px-6 py-16 sm:py-[4.5rem]">
      <div className="mx-auto max-w-3xl text-center">
        <ScrollReveal>
          <h2 className="text-balance font-poppins text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Mitwirken bei FehlerFix
          </h2>
          <p className="mt-3 text-lg text-ink/70">
            Ideen, Wünsche oder ist etwas kaputt? Klick einfach auf das
            Passende – dein Mailprogramm öffnet sich mit vorausgefülltem
            Betreff, du musst nur noch schreiben.
          </p>
        </ScrollReveal>

        <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
          {CONTRIBUTE_ITEMS.map((item) => (
            <a
              key={item.subject}
              href={contributeMailtoHref(item.subject)}
              className="block rounded-2xl border border-ink/10 bg-white px-5 py-4 font-semibold text-ink shadow-sm transition duration-150 hover:border-blue/30 hover:text-blue"
            >
              {item.title}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
