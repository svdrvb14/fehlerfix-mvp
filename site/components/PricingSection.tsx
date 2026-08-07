"use client";

import { useState } from "react";
import { ScrollReveal } from "./ScrollReveal";

type Plan = "monthly" | "yearly";

const FEATURES = [
  "Unbegrenzte Übungen",
  "Handschrifterkennung mit Apple Pencil",
  "Fehleranalyse mit Erklärung der Regel",
  "Persönlicher Fortschrittsverlauf",
];

const PLAN_INFO: Record<
  Plan,
  { price: string; unit: string; note?: string }
> = {
  monthly: { price: "7,50 €", unit: "/ Monat" },
  yearly: { price: "89,99 €", unit: "/ Jahr", note: "entspricht 7,50 € / Monat" },
};

export function PricingSection() {
  const [plan, setPlan] = useState<Plan>("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubscribe() {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
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

  const info = PLAN_INFO[plan];

  return (
    <section id="preise" className="relative scroll-mt-24 px-6 py-20 sm:py-28">
      <ScrollReveal className="mx-auto max-w-lg text-center">
        <h2 className="text-balance font-poppins text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Preise
        </h2>
        <p className="mt-3 text-lg text-ink/70">
          Ein Abo, alle Funktionen. Monatlich oder jährlich zahlen.
        </p>

        <div className="mx-auto mt-8 inline-flex rounded-full border border-ink/10 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setPlan("monthly")}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition duration-150 active:scale-95 ${
              plan === "monthly" ? "bg-ink text-white" : "text-ink/60"
            }`}
          >
            Monatlich
          </button>
          <button
            type="button"
            onClick={() => setPlan("yearly")}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition duration-150 active:scale-95 ${
              plan === "yearly" ? "bg-ink text-white" : "text-ink/60"
            }`}
          >
            Jährlich
          </button>
        </div>

        <div className="mt-8 rounded-3xl border-2 border-blue/30 bg-white p-8 text-left shadow-[0_10px_40px_rgba(0,0,0,0.06)] sm:p-10">
          <div className="flex items-baseline gap-2">
            <span className="font-poppins text-4xl font-bold text-ink">
              {info.price}
            </span>
            <span className="text-ink/60">{info.unit}</span>
          </div>
          {info.note && (
            <p className="mt-1 text-sm text-ink/50">{info.note}</p>
          )}

          <ul className="mt-6 space-y-3">
            {FEATURES.map((feature) => (
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

        <p className="mt-6 text-sm text-ink/50">
          Jederzeit kündbar. Widerrufsrecht laut gesetzlicher Regelung.
        </p>
      </ScrollReveal>
    </section>
  );
}
