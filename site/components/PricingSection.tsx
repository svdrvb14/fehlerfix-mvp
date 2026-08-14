"use client";

import { useState } from "react";
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

const BASE_FEATURES = [
  "Unbegrenzte Übungen",
  "Handschrifterkennung mit Apple Pencil",
  "Fehleranalyse mit Erklärung der Regel",
  "Persönlicher Fortschrittsverlauf",
];

function pillClass(active: boolean) {
  return `rounded-full px-5 py-2 text-sm font-semibold transition duration-150 active:scale-95 ${
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
  const total = totalPriceCents(language, billing, users);
  const singleUserPrice = totalPriceCents(language, billing, 1);
  const monthlyEquivalentCents = billing === "yearly" ? Math.round(perUser / 12) : null;
  const discountPercent = Math.round(FAMILY_DISCOUNT[users] * 100);

  const features =
    language === "combo"
      ? ["Rechtschreibung auf Deutsch und Englisch", ...BASE_FEATURES]
      : [
          `Rechtschreibung auf ${singleLanguage === "de" ? "Deutsch" : "Englisch"}`,
          ...BASE_FEATURES,
        ];

  return (
    <section id="preise" className="relative scroll-mt-24 px-6 py-20 sm:py-28">
      {/* Nur die statische Überschrift wird eingeblendet. Der interaktive Teil
          darunter darf NICHT in der Framer-Motion-Ebene liegen: die hält eine
          dauerhafte Transform-/Compositing-Ebene, in der WebKit Textwechsel
          teilweise nicht neu zeichnet - dann bleibt der alte Preis sichtbar,
          obwohl im DOM längst der neue steht (bzw. beide überlagern sich). */}
      <div className="mx-auto max-w-xl text-center">
        <ScrollReveal>
          <h2 className="text-balance font-poppins text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Preise
          </h2>
          <p className="mt-3 text-lg text-ink/70">
            Ein Abo, alle Funktionen. Für dich allein oder als Familienabo.
          </p>
        </ScrollReveal>

        <div className="mx-auto mt-8 inline-flex rounded-full border border-ink/10 bg-white p-1 shadow-sm">
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
          <div className="mx-auto mt-3 inline-flex rounded-full border border-ink/10 bg-white p-1 shadow-sm">
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

        <div className="mx-auto mt-3 inline-flex rounded-full border border-ink/10 bg-white p-1 shadow-sm">
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

        <div className="mt-6">
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

        <div className="relative mt-10">
          {users > 1 && (
            <div className="absolute left-1/2 top-0 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-coral px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-coral/30">
              🎉 −{discountPercent} % Familienrabatt
            </div>
          )}

          <div
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

              {users > 1 && (
                <p className="mt-1 text-sm font-semibold text-coral">
                  Gesamt {formatEuro(total)} {unitLabel} für {users} Nutzer
                </p>
              )}
            </div>

            <ul className="mt-6 space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-ink/80">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green" />
                  {feature}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={handleSubscribe}
              disabled={loading}
              className="mt-8 w-full rounded-full bg-coral px-7 py-3.5 text-center font-semibold text-white shadow-md transition duration-150 hover:bg-coral/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100"
            >
              {loading ? "Wird geladen…" : "Jetzt abonnieren"}
            </button>

            {error && (
              <p className="mt-3 text-sm text-coral" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>

        <p className="mt-6 text-sm text-ink/50">
          Jederzeit kündbar. Widerrufsrecht laut gesetzlicher Regelung.
        </p>
      </div>
    </section>
  );
}
