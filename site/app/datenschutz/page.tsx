import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Datenschutz – FehlerFix",
};

// ============================================================================
// WICHTIG: Diese Datenschutzerklärung ist ein sinnvoller Platzhalter, ersetzt
// aber keine rechtliche Prüfung. Bitte vor dem Live-Gang von einer
// Rechtsanwältin/einem Rechtsanwalt für Datenschutzrecht gegenprüfen lassen
// und alle mit [PLATZHALTER] markierten Stellen (Anschrift, Serverstandorte,
// Auftragsverarbeitungsverträge) vervollständigen.
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
          Wiesbaden
          <br />
          Deutschland
          <br />
          E-Mail:{" "}
          <a
            href="mailto:contact.us@fehlerfix.com"
            className="text-blue hover:underline"
          >
            contact.us@fehlerfix.com
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
          Daten verarbeitet, die für den Betrieb der Website, die
          Kontoverwaltung und die Zahlungsabwicklung technisch notwendig
          sind.
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          3. Registrierung &amp; Anmeldung (Supabase Auth)
        </h2>
        <p className="mt-3">
          Für den Zugang zum Kundenkonto unter <code>/konto</code> nutzen wir
          eine passwortlose Anmeldung per Magic Link. Dabei verarbeiten wir
          deine E-Mail-Adresse sowie technische Sitzungsdaten (Zugriffs- und
          Aktualisierungstoken), die von unserem Auth-Anbieter Supabase
          erzeugt werden.
        </p>
        <p className="mt-3">
          <strong>Kategorien verarbeiteter Daten:</strong> E-Mail-Adresse,
          Zeitpunkt der Registrierung/Anmeldung, Sitzungs- bzw.
          Authentifizierungstoken.
        </p>
        <p className="mt-3">
          <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
          (Erfüllung bzw. Anbahnung des Nutzungsvertrags für die
          FehlerFix-App).
        </p>
        <p className="mt-3">
          <strong>Speicherdauer:</strong> Bis zur Löschung deines Kontos.
          Du kannst die Löschung jederzeit per E-Mail an{" "}
          <a
            href="mailto:contact.us@fehlerfix.com"
            className="text-blue hover:underline"
          >
            contact.us@fehlerfix.com
          </a>{" "}
          beantragen.
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          4. Abo-Verwaltung (Supabase Datenbank)
        </h2>
        <p className="mt-3">
          In unserer Datenbank (bereitgestellt von Supabase) führen wir eine
          Tabelle mit Abo-Informationen, um dir unter <code>/konto</code> den
          Status deines Abos anzeigen zu können.
        </p>
        <p className="mt-3">
          <strong>Kategorien verarbeiteter Daten:</strong> E-Mail-Adresse,
          Stripe-Kunden- und Abo-ID, Abo-Status (aktiv/gekündigt/inaktiv),
          gebuchter Plan, Datum der nächsten Abrechnung.
        </p>
        <p className="mt-3">
          <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
          (Vertragserfüllung des Abo-Verhältnisses).
        </p>
        <p className="mt-3">
          <strong>Speicherdauer:</strong> Für die Dauer des Vertragsverhältnisses,
          danach entsprechend handels- und steuerrechtlicher Aufbewahrungsfristen
          {/* PLATZHALTER: konkrete Aufbewahrungsfristen (z.B. 6 bzw. 10 Jahre
              nach § 257 HGB / § 147 AO) durch Steuerberatung bestätigen lassen. */}{" "}
          (i.d.R. mehrere Jahre nach §§ 257 HGB, 147 AO).
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          5. Zahlungsabwicklung (Stripe)
        </h2>
        <p className="mt-3">
          Die Zahlungsabwicklung für das Abo erfolgt über den Zahlungsdienstleister
          Stripe. Beim Abschluss eines Abos wirst du auf eine von Stripe
          gehostete Checkout-Seite weitergeleitet. Deine Zahlungsdaten (z.B.
          Kreditkartendaten) gibst du direkt bei Stripe ein – wir selbst sehen
          und speichern diese Daten zu keinem Zeitpunkt.
        </p>
        <p className="mt-3">
          <strong>Kategorien verarbeiteter Daten:</strong> E-Mail-Adresse,
          Zahlungsdaten (bei Stripe), Rechnungsadresse (sofern von Stripe
          erhoben), Transaktionsdaten (Betrag, Zeitpunkt, Abo-Status).
        </p>
        <p className="mt-3">
          <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
          (Erfüllung des Zahlungsvorgangs für dein Abo).
        </p>
        <p className="mt-3">
          <strong>Speicherdauer:</strong> Entsprechend den Aufbewahrungspflichten
          von Stripe und unseren eigenen handels- und steuerrechtlichen
          Aufbewahrungsfristen.
        </p>
        <p className="mt-3">
          Weitere Informationen findest du in der Datenschutzerklärung von
          Stripe:{" "}
          <a
            href="https://stripe.com/de/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue hover:underline"
          >
            https://stripe.com/de/privacy
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          6. Auftragsverarbeitung &amp; Drittlandübermittlung
        </h2>
        <p className="mt-3">
          Mit Supabase und Stripe bestehen bzw. werden Auftragsverarbeitungsverträge
          gemäß Art. 28 DSGVO abgeschlossen.{" "}
          {/* PLATZHALTER: Serverstandort/Region des Supabase-Projekts sowie
              Details zu etwaigen Datenübermittlungen in Drittländer (z.B.
              Standardvertragsklauseln bei Stripe/Supabase mit Sitz außerhalb
              der EU) hier ergänzen, sobald final konfiguriert. */}
          Soweit dabei Daten in Länder außerhalb der EU/des EWR übermittelt
          werden, erfolgt dies auf Grundlage geeigneter Garantien (z.B.
          EU-Standardvertragsklauseln).
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          7. Hosting
        </h2>
        <p className="mt-3">
          Diese Website wird bei einem externen Hosting-Anbieter (z.B.
          Vercel) betrieben. Beim Aufruf der Seite verarbeitet der
          Hosting-Anbieter technisch notwendige Daten wie deine IP-Adresse,
          um die Seite ausliefern zu können. Rechtsgrundlage hierfür ist
          unser berechtigtes Interesse an einer sicheren und
          funktionsfähigen Bereitstellung der Website gemäß Art. 6 Abs. 1
          lit. f DSGVO.
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          8. Deine Rechte
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
          9. Änderungen dieser Datenschutzerklärung
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
