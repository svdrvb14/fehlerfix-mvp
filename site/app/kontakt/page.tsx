import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { CONTRIBUTE_ITEMS, contributeMailtoHref } from "@/lib/contribute";

export const metadata: Metadata = {
  title: "Kontakt – FehlerFix",
  description:
    "So erreichst du das FehlerFix-Team - allgemein oder direkt eines unserer Gründungsmitglieder.",
};

const TEAM_CONTACTS = [
  { name: "Salvador Elsen", role: "CFO & CTO", email: "salvador.elsen@fehlerfix.com" },
  { name: "Blanca Ostrowicz", role: "COO & CMO", email: "blanca.ostrowicz@fehlerfix.com" },
  { name: "Mariam Barry", role: "CEO & CAO", email: "mariam.barry@fehlerfix.com" },
];

export default function KontaktPage() {
  return (
    <LegalPage title="Kontakt">
      <p className="text-lg text-ink/70">
        Fragen, Feedback oder Support – wir sind für dich da.
      </p>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          Allgemeine Anfragen
        </h2>
        <p className="mt-3">
          Schreib uns einfach an{" "}
          <a
            href="mailto:contact.us@fehlerfix.com"
            className="font-semibold text-blue hover:underline"
          >
            contact.us@fehlerfix.com
          </a>{" "}
          – wir melden uns so schnell wie möglich zurück.
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          Das Team direkt erreichen
        </h2>
        <ul className="mt-3 space-y-3">
          {TEAM_CONTACTS.map((member) => (
            <li key={member.email}>
              <p className="font-semibold text-ink">{member.name}</p>
              <p className="text-sm text-ink/50">{member.role}</p>
              <a
                href={`mailto:${member.email}`}
                className="text-sm font-medium text-blue hover:underline"
              >
                {member.email}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          Mitwirken bei FehlerFix
        </h2>
        <p className="mt-3">
          Ideen, Wünsche oder ist etwas kaputt? Klick einfach auf das
          Passende – dein Mailprogramm öffnet sich mit vorausgefülltem
          Betreff, du musst nur noch schreiben.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {CONTRIBUTE_ITEMS.map((item) => (
            <li key={item.subject}>
              <a
                href={contributeMailtoHref(item.subject)}
                className="block h-full rounded-2xl border border-ink/10 bg-white px-5 py-4 font-semibold text-ink shadow-sm transition duration-150 hover:border-blue/30 hover:text-blue"
              >
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </LegalPage>
  );
}
