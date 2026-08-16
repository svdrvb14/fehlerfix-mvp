import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

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
    </LegalPage>
  );
}
