import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Impressum – FehlerFix",
};

// ============================================================================
// WICHTIG: Alle mit [PLATZHALTER] markierten Angaben musst du durch die
// echten Firmendaten ersetzen (Anschrift, Handelsregister sobald die GmbH
// eingetragen ist, Umsatzsteuer-ID etc.), bevor die Seite live geht.
// ============================================================================

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum">
      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          Angaben gemäß § 5 TMG
        </h2>
        <p className="mt-3">
          {/* PLATZHALTER: Sobald die GmbH eingetragen ist, hier den
              vollständigen Firmennamen (z.B. "FehlerFix GmbH") eintragen. */}
          FehlerFix GmbH (in Gründung)
          <br />
          {/* PLATZHALTER: echte Straße, Hausnummer, PLZ, Ort eintragen */}
          [Straße und Hausnummer]
          <br />
          [PLZ] [Ort]
          <br />
          Deutschland
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          Vertreten durch
        </h2>
        <p className="mt-3">
          Salvador Elsen, Mariam Barry, Blanca Ostrowicz
          {/* PLATZHALTER: sobald die GmbH eingetragen ist, hier die
              tatsächlichen Geschäftsführer:innen laut Handelsregister
              eintragen. */}
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          Kontakt
        </h2>
        <p className="mt-3">
          E-Mail:{" "}
          <a
            href="mailto:contact.teamfehlerfix@gmail.com"
            className="text-blue hover:underline"
          >
            contact.teamfehlerfix@gmail.com
          </a>
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          Registereintrag
        </h2>
        <p className="mt-3">
          {/* PLATZHALTER: Handelsregister, Registergericht und
              Registernummer erst eintragen, sobald die GmbH tatsächlich
              im Handelsregister eingetragen ist. Bis dahin diesen Absatz
              so stehen lassen oder entfernen. */}
          Eintragung im Handelsregister ist derzeit noch nicht erfolgt. Diese
          Angaben werden ergänzt, sobald die FehlerFix GmbH im Handelsregister
          eingetragen ist.
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          Umsatzsteuer-Identifikationsnummer
        </h2>
        <p className="mt-3">
          {/* PLATZHALTER: USt-IdNr. gemäß § 27a Umsatzsteuergesetz eintragen,
              sobald vorhanden. */}
          [USt-IdNr. wird ergänzt]
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
        </h2>
        <p className="mt-3">
          Salvador Elsen
          <br />
          {/* PLATZHALTER: gleiche Anschrift wie oben */}
          [Straße und Hausnummer], [PLZ] [Ort]
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          Streitschlichtung
        </h2>
        <p className="mt-3">
          Die Europäische Kommission stellt eine Plattform zur
          Online-Streitbeilegung (OS) bereit:{" "}
          <a
            href="https://ec.europa.eu/consumers/odr/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue hover:underline"
          >
            https://ec.europa.eu/consumers/odr/
          </a>
          . Wir sind nicht verpflichtet und nicht bereit, an
          Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
          teilzunehmen.
        </p>
      </section>
    </LegalPage>
  );
}
