import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LivingBackground } from "@/components/LivingBackground";

export const metadata: Metadata = {
  title: "Abo verwalten – FehlerFix",
  description:
    "Verwalte dein FehlerFix-Abo selbst: kündigen, Zahlungsmittel ändern oder Rechnungen einsehen - sicher über Stripe, ganz ohne eigenes Passwort bei uns.",
};

const PORTAL_URL = process.env.NEXT_PUBLIC_STRIPE_PORTAL_LOGIN_URL;

export default function KontoPage({
  searchParams,
}: {
  searchParams: { checkout?: string };
}) {
  const checkoutSuccess = searchParams.checkout === "success";

  return (
    <div className="relative">
      <LivingBackground />
      <Header />
      <main className="px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-md rounded-3xl border border-ink/10 bg-white p-8 shadow-[0_10px_40px_rgba(0,0,0,0.06)] sm:p-10">
          {checkoutSuccess && (
            <p
              className="mb-6 rounded-2xl bg-green/15 px-5 py-4 text-center text-sm font-medium text-ink"
              role="status"
            >
              Zahlung erfolgreich! Dein Abo wird in Kürze aktiv. Hier kannst
              du es jederzeit verwalten.
            </p>
          )}

          <h1 className="font-poppins text-2xl font-bold text-ink">
            Abo verwalten
          </h1>
          <p className="mt-3 text-ink/70">
            Kündigen, Zahlungsmittel ändern oder Rechnungen einsehen – das
            läuft direkt und sicher über unseren Zahlungsdienstleister
            Stripe. Du bestätigst dort einmalig deine beim Kauf verwendete
            E-Mail-Adresse per Code, ganz ohne eigenes Passwort bei uns.
          </p>

          {PORTAL_URL ? (
            <a
              href={PORTAL_URL}
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-coral px-7 py-3.5 text-center font-semibold text-white shadow-md transition duration-150 hover:bg-coral/90 active:scale-[0.98]"
            >
              Zum Abo-Bereich →
            </a>
          ) : (
            <p className="mt-6 text-sm text-ink/50">
              Der Abo-Bereich ist gerade nicht erreichbar. Schreib uns
              stattdessen kurz an{" "}
              <Link href="/kontakt" className="font-semibold text-blue hover:underline">
                unser Kontaktformular
              </Link>
              .
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
