import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Datenschutz – FehlerFix",
};

// ============================================================================
// WICHTIG: Diese Datenschutzerklärung ist ein sinnvoller Platzhalter, ersetzt
// aber keine rechtliche Prüfung. Bitte vor dem Live-Gang von einer
// Rechtsanwältin/einem Rechtsanwalt für Datenschutzrecht gegenprüfen lassen
// und die mit [PLATZHALTER] markierten Stellen (Anschrift, ggf. Hosting-
// Standort) vervollständigen.
// ============================================================================

export default function DatenschutzPage() {
  return (
    <LegalPage title="Datenschutzerklärung">
      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          1. Verantwortlicher
        </h2>
        <p className="mt-3">
          Verantwortlich für die Datenverarbeitung auf dieser Website ist:
          <br />
          FehlerFix GmbH (in Gründung)
          {/* PLATZHALTER: echte Anschrift eintragen, siehe Impressum */}
          <br />
          [Straße und Hausnummer], [PLZ] [Ort]
          <br />
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
          2. Kein Tracking, keine Analyse-Cookies
        </h2>
        <p className="mt-3">
          Diese Website verwendet weder Google Analytics noch vergleichbare
          Tracking- oder Analyse-Dienste und setzt keine Marketing- oder
          Statistik-Cookies. Es werden ausschließlich die unten beschriebenen
          Daten verarbeitet, die für den Betrieb der Warteliste technisch
          notwendig sind.
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          3. Eintragung in die Warteliste
        </h2>
        <p className="mt-3">
          Wenn du dich über eines der Formulare auf dieser Seite für die
          Warteliste einträgst, erhebt und speichert die FehlerFix GmbH die
          von dir eingegebene E-Mail-Adresse.
        </p>
        <p className="mt-3">
          <strong>Zweck:</strong> Wir nutzen deine E-Mail-Adresse
          ausschließlich, um dich zu benachrichtigen, sobald FehlerFix live
          geht bzw. dir wichtige Neuigkeiten zum Produktstart mitzuteilen.
        </p>
        <p className="mt-3">
          <strong>Rechtsgrundlage:</strong> Die Verarbeitung erfolgt auf
          Grundlage deiner Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO, die
          du durch das aktive Absenden des Formulars erteilst.
        </p>
        <p className="mt-3">
          <strong>Speicherdauer:</strong> Wir speichern deine E-Mail-Adresse,
          bis du deine Einwilligung widerrufst oder der Zweck (Information
          über den Produktstart) entfällt. Danach wird sie gelöscht.
        </p>
        <p className="mt-3">
          <strong>Widerruf:</strong> Du kannst deine Einwilligung jederzeit
          mit Wirkung für die Zukunft widerrufen, indem du uns eine E-Mail an{" "}
          <a
            href="mailto:contact.teamfehlerfix@gmail.com"
            className="text-blue hover:underline"
          >
            contact.teamfehlerfix@gmail.com
          </a>{" "}
          schickst. Die Rechtmäßigkeit der bis zum Widerruf erfolgten
          Verarbeitung bleibt davon unberührt.
        </p>
        <p className="mt-3">
          <strong>Auftragsverarbeitung:</strong> Zur technischen Speicherung
          der Warteliste nutzen wir den Dienst{" "}
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue hover:underline"
          >
            Supabase
          </a>
          . Mit Supabase besteht bzw. wird ein Auftragsverarbeitungsvertrag
          gemäß Art. 28 DSGVO abgeschlossen.{" "}
          {/* PLATZHALTER: Serverstandort/Region des Supabase-Projekts hier
              ergänzen (z.B. EU-Region), sobald das Projekt final
              konfiguriert ist. */}
          Die Datenbank ist über Sicherheitsregeln (Row Level Security) so
          eingerichtet, dass ausschließlich das Eintragen neuer
          E-Mail-Adressen möglich ist – ein Auslesen, Verändern oder Löschen
          der Warteliste über die Website ist technisch nicht möglich.
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          4. Hosting
        </h2>
        <p className="mt-3">
          Diese Website wird bei einem externen Hosting-Anbieter (z.B.
          Vercel) betreut. Beim Aufruf der Seite verarbeitet der
          Hosting-Anbieter technisch notwendige Daten wie deine
          IP-Adresse, um die Seite ausliefern zu können. Rechtsgrundlage
          hierfür ist unser berechtigtes Interesse an einer sicheren und
          funktionsfähigen Bereitstellung der Website gemäß Art. 6 Abs. 1
          lit. f DSGVO.
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          5. Deine Rechte
        </h2>
        <p className="mt-3">
          Du hast jederzeit das Recht auf Auskunft über die zu deiner Person
          gespeicherten Daten (Art. 15 DSGVO), auf Berichtigung (Art. 16
          DSGVO), auf Löschung (Art. 17 DSGVO), auf Einschränkung der
          Verarbeitung (Art. 18 DSGVO) sowie auf Datenübertragbarkeit (Art.
          20 DSGVO). Außerdem hast du das Recht, dich bei einer
          Datenschutz-Aufsichtsbehörde zu beschweren (Art. 77 DSGVO), wenn du
          der Ansicht bist, dass die Verarbeitung deiner Daten gegen die
          DSGVO verstößt.
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          6. Änderungen dieser Datenschutzerklärung
        </h2>
        <p className="mt-3">
          Wir passen diese Datenschutzerklärung an, sobald Änderungen an der
          Datenverarbeitung dies erforderlich machen. Die jeweils aktuelle
          Version findest du immer auf dieser Seite.
        </p>
      </section>
    </LegalPage>
  );
}
