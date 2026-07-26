import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Widerrufsbelehrung – FehlerFix",
};

// ============================================================================
// WICHTIG: Dies ist eine Muster-Widerrufsbelehrung für digitale
// Abo-Dienstleistungen (angelehnt an die gesetzliche Muster-Widerrufsbelehrung
// nach Art. 246a § 1 Abs. 2 EGBGB). Sie MUSS vor dem Live-Gang von einer
// Rechtsanwältin / einem Rechtsanwalt geprüft werden. Alle mit [PLATZHALTER]
// markierten Stellen (Firmendaten, Kontaktweg für den Widerruf) sind vorher
// zu vervollständigen.
// ============================================================================

export default function WiderrufPage() {
  return (
    <LegalPage title="Widerrufsbelehrung">
      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          Widerrufsrecht
        </h2>
        <p className="mt-3">
          Verbraucher:innen haben das Recht, binnen vierzehn Tagen ohne Angabe
          von Gründen diesen Vertrag zu widerrufen.
        </p>
        <p className="mt-3">
          Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des
          Vertragsschlusses (Abschluss des Abonnements).
        </p>
        <p className="mt-3">
          Um dein Widerrufsrecht auszuüben, musst du uns
          <br />
          FehlerFix GmbH (in Gründung)
          {/* PLATZHALTER: Anschrift wie im Impressum */}
          <br />
          E-Mail:{" "}
          <a
            href="mailto:contact.us@fehlerfix.com"
            className="text-blue hover:underline"
          >
            contact.us@fehlerfix.com
          </a>
          <br />
          mittels einer eindeutigen Erklärung (z.B. ein mit der Post
          versandter Brief oder eine E-Mail) über deinen Entschluss, diesen
          Vertrag zu widerrufen, informieren. Du kannst dafür das unten
          stehende Muster-Widerrufsformular verwenden, das jedoch nicht
          vorgeschrieben ist.
        </p>
        <p className="mt-3">
          Zur Wahrung der Widerrufsfrist reicht es aus, dass du die
          Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der
          Widerrufsfrist absendest.
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          Folgen des Widerrufs
        </h2>
        <p className="mt-3">
          Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen,
          die wir von dir erhalten haben, unverzüglich und spätestens binnen
          vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung
          über deinen Widerruf dieses Vertrags bei uns eingegangen ist. Für
          diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei
          der ursprünglichen Transaktion eingesetzt hast, es sei denn, mit
          dir wurde ausdrücklich etwas anderes vereinbart; in keinem Fall
          werden dir wegen dieser Rückzahlung Entgelte berechnet.
        </p>
        <p className="mt-3">
          Hast du verlangt, dass die Erbringung der Dienstleistung (Zugang
          zur FehlerFix-App) während der Widerrufsfrist beginnen soll, so
          hast du uns einen angemessenen Betrag zu zahlen, der dem Anteil
          der bis zu dem Zeitpunkt, zu dem du uns von der Ausübung des
          Widerrufsrechts hinsichtlich dieses Vertrags unterrichtest, bereits
          erbrachten Dienstleistung entspricht.
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          Vorzeitiges Erlöschen des Widerrufsrechts
        </h2>
        <p className="mt-3">
          Dein Widerrufsrecht erlischt vorzeitig, wenn wir die Dienstleistung
          vollständig erbracht haben und wir mit der Ausführung der
          Dienstleistung erst begonnen haben, nachdem du
        </p>
        <ul className="ml-5 mt-3 list-disc space-y-2">
          <li>
            deine ausdrückliche Zustimmung gegeben hast, dass wir mit der
            Ausführung der Dienstleistung vor Ablauf der Widerrufsfrist
            beginnen, und
          </li>
          <li>
            deine Kenntnis davon bestätigt hast, dass du durch deine
            Zustimmung mit Beginn der Ausführung des Vertrags dein
            Widerrufsrecht verlierst.
          </li>
        </ul>
        <p className="mt-3">
          {/* PLATZHALTER/TODO: Der konkrete Zustimmungs- und
              Bestätigungsprozess (Checkbox im Checkout-Flow o.ä.) muss noch
              technisch umgesetzt und rechtlich geprüft werden, damit sich
              FehlerFix tatsächlich auf dieses vorzeitige Erlöschen berufen
              kann. */}
          Diesen Zustimmungsprozess setzen wir aktuell noch nicht technisch
          um – bis dahin gilt das Widerrufsrecht unverkürzt für die vollen
          vierzehn Tage.
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          Muster-Widerrufsformular
        </h2>
        <p className="mt-3">
          (Wenn du den Vertrag widerrufen willst, fülle bitte dieses Formular
          aus und sende es zurück.)
        </p>
        <p className="mt-4 rounded-2xl bg-ink/5 p-5">
          An FehlerFix GmbH (in Gründung), {/* PLATZHALTER: Anschrift */}
          <br />
          E-Mail: contact.us@fehlerfix.com
          <br />
          <br />
          Hiermit widerrufe(n) ich/wir den von mir/uns abgeschlossenen
          Vertrag über das FehlerFix-Abonnement.
          <br />
          <br />
          Bestellt am: _______________
          <br />
          Name des/der Verbraucher(s): _______________
          <br />
          Anschrift des/der Verbraucher(s): _______________
          <br />
          Datum: _______________
        </p>
      </section>
    </LegalPage>
  );
}
