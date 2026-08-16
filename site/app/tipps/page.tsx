import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Tipps & Aktionen – FehlerFix",
  description:
    "So holst du das Beste aus FehlerFix heraus - und sparst dabei: Jahresabo, Gruppenangebot und die Freundschaftswerbung.",
};

export default function TippsPage() {
  return (
    <LegalPage title="Tipps &amp; Aktionen">
      <p className="text-lg text-ink/70">
        Ein paar Dinge, die dir helfen, aus FehlerFix das Beste rauszuholen –
        und dabei auch noch zu sparen.
      </p>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          Dranbleiben lohnt sich – deshalb ist das Jahresabo günstiger
        </h2>
        <p className="mt-3">
          Rechtschreibung, Ausdruck und Grammatik verbessern sich nicht über
          Nacht, sondern durch regelmäßiges Üben über einen längeren
          Zeitraum. Wer wirklich sichtbare Fortschritte machen will, braucht
          Zeit – und genau deshalb lohnt sich das Jahresabo besonders: Pro
          Monat gerechnet ist es spürbar günstiger als das Monatsabo. Du
          bleibst automatisch dran, statt jeden Monat neu zu entscheiden, und
          zahlst dafür weniger.
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          Gemeinsam günstiger: das Gruppenangebot
        </h2>
        <p className="mt-3">
          Du musst FehlerFix nicht allein nutzen. Tu dich mit Freunden,
          Geschwistern oder deiner Klasse zusammen und bucht gemeinsam das
          Gruppenangebot für 2 bis 4 Nutzer:innen. Der Rabatt wächst mit
          jeder Person, die dazukommt – bis zu 33&nbsp;% günstiger pro
          Nutzer:in bei 4 Personen.
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          Freunde empfehlen, gratis Monat sichern
        </h2>
        <p className="mt-3">
          Kennst du jemanden, dem FehlerFix auch helfen würde? Empfiehl die
          App weiter – sobald sich dein Freund oder deine Freundin FehlerFix
          holt, bekommst du einen Monat FehlerFix geschenkt.
        </p>
      </section>
    </LegalPage>
  );
}
