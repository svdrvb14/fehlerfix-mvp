import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Warum kostet FehlerFix, was es kostet? – FehlerFix",
  description:
    "Was hinter dem Preis von FehlerFix steckt: KI-Analyse, individuelle Fehlerprofile, Lehrplan-Abgleich, Gamification und zwei vollständige Sprachversionen.",
};

export default function WarumSoTeuerPage() {
  return (
    <LegalPage title="Warum kostet FehlerFix, was es kostet?">
      <p className="text-lg text-ink/70">
        Der Preis wirkt auf den ersten Blick vielleicht hoch für eine
        Lern-App. Aber hinter jeder Übung, jeder Korrektur und jedem
        Fehlerprofil steckt weit mehr als eine einfache
        Rechtschreibprüfung – und das kostet uns echtes Geld, jeden Tag.
      </p>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          Jede Analyse kostet echte KI-Rechenzeit
        </h2>
        <p className="mt-3">
          Jedes Mal, wenn FehlerFix deine Handschrift liest, deinen Text
          analysiert oder eine neue Übung für dich generiert, läuft im
          Hintergrund ein leistungsstarkes KI-Modell. Diese Anfragen sind
          nicht kostenlos – wir zahlen für jede einzelne Analyse an unsere
          KI-Anbieter, unabhängig davon, wie viele Nutzer:innen gerade aktiv
          sind.
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          Mehr als Rechtschreibprüfung
        </h2>
        <p className="mt-3">
          FehlerFix erkennt nicht nur falsch geschriebene Wörter. Wir
          erstellen aus deiner Handschrift ein individuelles Fehlerprofil,
          gleichen es mit den Kompetenzen ab, die laut Kultusministerium in
          deiner Klassenstufe verlangt werden, und generieren daraus
          Übungen, die genau zu dir passen – und sich mit deinem Fortschritt
          immer weiterentwickeln, statt starr zu bleiben.
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          Damit man wirklich dranbleibt
        </h2>
        <p className="mt-3">
          Übungen bringen nur etwas, wenn man sie auch macht. Deshalb
          stecken wir gezielt in Gamification, Challenges und Leaderboards,
          damit Lernen sich nicht wie Pflicht, sondern wie ein Spiel mit
          echtem Fortschritt anfühlt.
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          Vier Bereiche, nicht nur einer
        </h2>
        <p className="mt-3">
          Wir kümmern uns nicht nur um Rechtschreibung, sondern auch um
          Grammatik, Zeichensetzung, Vokabular und – oft unterschätzt –
          deinen Ausdruck. Vier Kompetenzbereiche, die zusammen erst
          wirklich zeigen, wie gut jemand schreiben kann.
        </p>
      </section>

      <section>
        <h2 className="font-poppins text-xl font-semibold text-ink">
          Auf Deutsch und auf Englisch
        </h2>
        <p className="mt-3">
          Das komplette Programm gibt es nicht nur für Deutsch, sondern
          genauso für Englisch – zwei vollständige Sprachversionen, die wir
          beide unabhängig voneinander pflegen und weiterentwickeln.
        </p>
      </section>

      <p className="text-lg text-ink/70">
        Kurz gesagt: Der Preis deckt nicht nur eine App, sondern ein System
        aus KI-Analyse, individuellem Lernpfad und ständiger
        Weiterentwicklung – für zwei Sprachen, auf jedem Niveau.
      </p>
    </LegalPage>
  );
}
