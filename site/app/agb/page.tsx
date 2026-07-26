import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "AGB – FehlerFix",
};

// ============================================================================
// WICHTIG: Diese AGB sind ein unverbindlicher Muster-Platzhalter für ein
// digitales Abo-Produkt und MÜSSEN vor dem Live-Gang von einer Rechtsanwältin
// / einem Rechtsanwalt geprüft werden. Alle mit [PLATZHALTER] markierten
// Stellen (Firmendaten, Handelsregister, Kündigungsfristen, Preise) sind vor
// der Prüfung zu vervollständigen bzw. mit der Rechtsberatung abzustimmen.
// ============================================================================

export default function AgbPage() {
  return (
    <LegalPage title="Allgemeine Geschäftsbedingungen">
      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          1. Geltungsbereich
        </h2>
        <p className="mt-3">
          Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle
          Verträge zwischen der FehlerFix GmbH (in Gründung){" "}
          {/* PLATZHALTER: Anschrift wie im Impressum */}
          (&bdquo;FehlerFix&ldquo;, &bdquo;wir&ldquo;) und ihren Kund:innen (&bdquo;Nutzer:innen&ldquo;) über die
          Nutzung der FehlerFix-App und des zugehörigen Abonnements.
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          2. Vertragsgegenstand
        </h2>
        <p className="mt-3">
          FehlerFix stellt eine KI-gestützte Anwendung für das iPad bereit,
          die handschriftlich (mit Apple Pencil) verfasste Texte auf
          Rechtschreib-, Grammatik- und Zeichensetzungsfehler analysiert und
          die zugrunde liegende Regel erklärt. Die App richtet sich an
          Schülerinnen und Schüler der Klassen 3 bis 13 im deutschsprachigen
          Raum (DACH).
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          3. Vertragsschluss
        </h2>
        <p className="mt-3">
          Der Vertrag über ein Abonnement kommt durch die Buchung eines
          kostenpflichtigen Plans über die von unserem Zahlungsdienstleister
          Stripe gehostete Checkout-Seite zustande. Mit Abschluss des
          Zahlungsvorgangs gilt der Vertrag als geschlossen.
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          4. Preise &amp; Zahlung
        </h2>
        <p className="mt-3">
          Es gelten die zum Zeitpunkt der Buchung auf der Website angezeigten
          Preise{" "}
          {/* PLATZHALTER: aktuelle Preise, ggf. inkl./exkl. USt. je nach
              Rechtsform und Kundengruppe, mit Steuerberatung abstimmen */}
          (aktuell 7,50 € pro Monat bzw. 89,99 € pro Jahr). Die Zahlung
          erfolgt wiederkehrend (monatlich oder jährlich) über Stripe.
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          5. Laufzeit &amp; Kündigung
        </h2>
        <p className="mt-3">
          Das Abonnement verlängert sich automatisch um die jeweils gebuchte
          Laufzeit (Monat oder Jahr), sofern es nicht vorher gekündigt wird.
          Die Kündigung ist jederzeit zum Ende der laufenden Abrechnungsperiode
          über die Abo-Verwaltung im Kundenkonto (<code>/konto</code>) möglich.
          {/* PLATZHALTER: konkrete Kündigungsfrist mit Rechtsberatung
              festlegen, falls von "jederzeit zum Periodenende" abgewichen
              werden soll. */}
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          6. Widerrufsrecht
        </h2>
        <p className="mt-3">
          Verbraucher:innen steht ein gesetzliches Widerrufsrecht zu. Details
          dazu findest du in unserer{" "}
          <a href="/widerruf" className="text-blue hover:underline">
            Widerrufsbelehrung
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          7. Verfügbarkeit &amp; Haftung
        </h2>
        <p className="mt-3">
          Wir bemühen uns um eine möglichst unterbrechungsfreie Verfügbarkeit
          der App, können diese aber nicht garantieren. Die Haftung für
          leichte Fahrlässigkeit ist ausgeschlossen, soweit keine wesentlichen
          Vertragspflichten oder Schäden aus der Verletzung von Leben, Körper
          oder Gesundheit betroffen sind.{" "}
          {/* PLATZHALTER: Haftungsklausel unbedingt von Rechtsberatung
              formulieren/prüfen lassen. */}
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          8. Änderungen der AGB
        </h2>
        <p className="mt-3">
          Wir behalten uns vor, diese AGB mit Wirkung für die Zukunft zu
          ändern. Über wesentliche Änderungen informieren wir dich rechtzeitig
          per E-Mail.
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          9. Schlussbestimmungen
        </h2>
        <p className="mt-3">
          Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss
          des UN-Kaufrechts. Sollte eine Bestimmung dieser AGB unwirksam sein,
          bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
        </p>
      </section>
    </LegalPage>
  );
}
