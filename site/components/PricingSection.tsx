"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ScrollReveal } from "./ScrollReveal";
import {
  FAMILY_DISCOUNT,
  formatEuro,
  perUserPriceCents,
  totalPriceCents,
  USER_COUNTS,
  type Billing,
  type Language,
  type UserCount,
} from "@/lib/pricing";

type SingleLanguage = "de" | "en";

const FEATURES = [
  {
    title: "Individuelles Fehlerprofil",
    desc: "FehlerFix erkennt deine persönlichen Fehlermuster in Rechtschreibung, Grammatik, Zeichensetzung, Ausdruck und Vokabular",
  },
  {
    title: "Passgenaue Übungen statt Zufallsaufgaben",
    desc: "jede Übung ist auf genau deine Schwächen zugeschnitten, nicht generisch",
  },
  {
    title: "Handschrifttraining mit Stylus",
    desc: "motorische Förderung direkt beim Üben, auf jedem Tablet",
  },
  {
    title: "Unbegrenzte, sich weiterentwickelnde Übungen",
    desc: "das System passt sich mit jedem deiner Fortschritte neu an",
  },
  {
    title: "Persönlicher Fortschrittsverlauf",
    desc: "du siehst schwarz auf weiß, wie sich deine Fehlerquote verbessert",
  },
];

function pillClass(active: boolean) {
  return `rounded-full px-4 py-1.5 text-sm font-semibold transition duration-150 active:scale-95 ${
    active ? "bg-ink text-white" : "text-ink/60"
  }`;
}

export function PricingSection() {
  const [language, setLanguage] = useState<Language>("single");
  const [singleLanguage, setSingleLanguage] = useState<SingleLanguage>("de");
  const [billing, setBilling] = useState<Billing>("monthly");
  const [users, setUsers] = useState<UserCount>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const priceCardRef = useRef<HTMLDivElement>(null);

  // Absicherung gegen einen bekannten WebKit/Safari-Bug: der Preisblock wird
  // bei jeder Auswahländerung zwar korrekt neu erzeugt (siehe key unten),
  // aber manche Safari-Versionen malen Text in schnell aufeinanderfolgenden
  // DOM-Wechseln trotzdem nicht zuverlässig neu (alter Inhalt bleibt sichtbar
  // stehen, teils überlagert von neuem). Das erzwingt in jedem Fall ein
  // sauberes Neuzeichnen, unabhängig vom React-Reconciliation-Verhalten.
  useEffect(() => {
    const el = priceCardRef.current;
    if (!el) return;
    void el.offsetHeight; // synchrones Reflow
    el.style.transform = "translateZ(0)";
    const raf = requestAnimationFrame(() => {
      if (el) el.style.transform = "";
    });
    return () => cancelAnimationFrame(raf);
  }, [language, singleLanguage, billing, users]);

  // "Jetzt abonnieren" verlässt die Seite Richtung Stripe, ohne dass
  // setLoading(false) je aufgerufen wird (Erfolgsfall braucht das nicht,
  // die Seite wird ja verlassen). Kommt man per Zurück-Button dahin zurück,
  // stellt der Browser die Seite oft unverändert aus dem bfcache wieder her
  // - inklusive des eingefrorenen loading:true, ohne dass irgendein Render
  // das je auflösen würde. Der Button bliebe für immer auf "Wird geladen…"
  // hängen und ließe sich nicht mehr klicken.
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        setLoading(false);
      }
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  async function handleSubscribe() {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: billing,
          language,
          users,
          ...(language === "single" ? { singleLanguage } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Checkout konnte nicht gestartet werden.");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Da ist etwas schiefgelaufen. Bitte versuch es gleich noch einmal."
      );
      setLoading(false);
    }
  }

  const unitLabel = billing === "monthly" ? "/ Monat" : "/ Jahr";
  const perUser = perUserPriceCents(language, billing, users);
  const singleUserPrice = totalPriceCents(language, billing, 1);
  const monthlyEquivalentCents = billing === "yearly" ? Math.round(perUser / 12) : null;
  const discountPercent = Math.round(FAMILY_DISCOUNT[users] * 100);

  return (
    <section id="preise" className="relative scroll-mt-24 px-6 py-16 sm:py-[4.5rem]">
      {/* Nur die statische Überschrift wird eingeblendet. Der interaktive Teil
          darunter darf NICHT in der Framer-Motion-Ebene liegen: die hält eine
          dauerhafte Transform-/Compositing-Ebene, in der WebKit Textwechsel
          teilweise nicht neu zeichnet - dann bleibt der alte Preis sichtbar,
          obwohl im DOM längst der neue steht (bzw. beide überlagern sich). */}
      <div className="mx-auto max-w-3xl text-center">
        <ScrollReveal>
          <h2 className="text-balance font-poppins text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Preise
          </h2>
          <p className="mt-3 text-lg text-ink/70">
            Ein Abo, alle Funktionen. Für dich allein oder als Gruppenabo.
          </p>
        </ScrollReveal>

        {/* Sprache + Sub-Auswahl + Abrechnung in EINER flex-wrap-Zeile statt
            gestapelter Blöcke - nur die Nutzeranzahl bleibt eine eigene
            Zeile. So bleiben Preiskarte und "Preise"-Überschrift auch auf
            normalen Bildschirmhöhen sichtbar, egal welche Auswahl aktiv ist. */}
        <div className="mx-auto mt-5 flex flex-wrap items-center justify-center gap-2">
          <div className="inline-flex rounded-full border border-ink/10 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setLanguage("single")}
              className={pillClass(language === "single")}
            >
              Einzelsprache
            </button>
            <button
              type="button"
              onClick={() => setLanguage("combo")}
              className={pillClass(language === "combo")}
            >
              Deutsch + Englisch
            </button>
          </div>

          {language === "single" && (
            <div className="inline-flex rounded-full border border-ink/10 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setSingleLanguage("de")}
                className={pillClass(singleLanguage === "de")}
              >
                Deutsch
              </button>
              <button
                type="button"
                onClick={() => setSingleLanguage("en")}
                className={pillClass(singleLanguage === "en")}
              >
                Englisch
              </button>
            </div>
          )}

          <div className="inline-flex rounded-full border border-ink/10 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={pillClass(billing === "monthly")}
            >
              Monatlich
            </button>
            <button
              type="button"
              onClick={() => setBilling("yearly")}
              className={pillClass(billing === "yearly")}
            >
              Jährlich
            </button>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium text-ink/50">Nutzeranzahl</p>
          <div className="mx-auto mt-2 inline-flex rounded-full border border-ink/10 bg-white p-1 shadow-sm">
            {USER_COUNTS.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setUsers(count)}
                className={`h-9 w-9 rounded-full text-sm font-semibold transition duration-150 active:scale-95 ${
                  users === count ? "bg-ink text-white" : "text-ink/60"
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          <Link
            href="/tipps"
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-4 py-1.5 text-sm font-medium text-ink/70 shadow-sm transition duration-150 hover:border-blue/30 hover:text-blue"
          >
            💡 Tipps zu den Preisen
          </Link>
        </div>

        <div className="relative mt-5">
          {users > 1 && (
            <div className="absolute left-1/2 top-0 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-coral px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-coral/30">
              🎉 −{discountPercent} % Gruppenrabatt
            </div>
          )}

          {/* Ab lg: genug Platz rechts neben der Karte für den Hinweis samt
              handgezeichnetem Pfeil. Darunter reicht kein Platz mehr dafür -
              da gibt es stattdessen den einfachen Link unter der Karte. */}
          <div className="pointer-events-none absolute -right-4 top-8 hidden w-44 translate-x-full lg:block">
            <svg
              width="130"
              height="100"
              viewBox="0 0 130 100"
              fill="none"
              className="text-coral"
              aria-hidden
            >
              <path
                d="M8 6 C 70 2, 112 36, 100 82"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M100 82 L 91 68 M100 82 L 111 73"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            <Link
              href="/warum-so-teuer"
              className="pointer-events-auto -mt-1 ml-6 inline-block whitespace-nowrap text-sm font-semibold text-coral hover:underline"
            >
              warum so teuer?
            </Link>
          </div>

          <div
            ref={priceCardRef}
            className={`rounded-3xl border-2 bg-white p-8 pt-10 text-left shadow-[0_10px_40px_rgba(0,0,0,0.06)] sm:p-10 sm:pt-12 ${
              users > 1 ? "border-coral/40" : "border-blue/30"
            }`}
          >
            {/* Der GESAMTE auswahlabhängige Preisblock bekommt einen key -
                nicht nur die erste Zeile. Sonst bleiben die Zusatzzeilen
                ("entspricht ... / Monat", "Gesamt ...") als reine
                Textaustausche im bestehenden Knoten stehen und werden vom
                Browser genauso wenig neu gezeichnet wie zuvor der Preis. */}
            <div key={`${language}-${singleLanguage}-${billing}-${users}`}>
              <div className="flex flex-wrap items-baseline gap-2">
                {users > 1 && (
                  <span className="text-xl text-ink/35 line-through">
                    {formatEuro(singleUserPrice)}
                  </span>
                )}
                <span className="font-poppins text-4xl font-bold text-ink">
                  {formatEuro(perUser)}
                </span>
                <span className="text-ink/60">
                  {unitLabel}
                  {users > 1 ? " pro Nutzer" : ""}
                </span>
              </div>

              {monthlyEquivalentCents !== null && (
                <p className="mt-1 text-sm text-ink/50">
                  entspricht {formatEuro(monthlyEquivalentCents)} / Monat
                </p>
              )}
            </div>

            <ul className="mt-5 space-y-2.5">
              {FEATURES.map((feature) => (
                <li key={feature.title} className="flex items-start gap-3 text-ink/80">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green" />
                  <span>
                    <span className="font-semibold text-ink">{feature.title}</span>
                    {" – "}
                    {feature.desc}
                  </span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={handleSubscribe}
              disabled={loading}
              className="mt-6 w-full rounded-full bg-coral px-7 py-3.5 text-center font-semibold text-white shadow-md transition duration-150 hover:bg-coral/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100"
            >
              {loading ? "Wird geladen…" : "7 Tage kostenlos testen"}
            </button>

            {error && (
              <p className="mt-3 text-sm text-coral" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="mt-3 text-center lg:hidden">
            <Link
              href="/warum-so-teuer"
              className="text-sm font-semibold text-coral hover:underline"
            >
              warum so teuer?
            </Link>
          </div>
        </div>

        <p className="mt-6 text-sm text-ink/50">
          7 Tage kostenlos testen, danach jederzeit kündbar. Widerrufsrecht
          laut gesetzlicher Regelung.
        </p>
      </div>
    </section>
  );
}
