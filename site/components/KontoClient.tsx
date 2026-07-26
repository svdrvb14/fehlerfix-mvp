"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type SubscriptionRow = {
  status: string;
  plan: string | null;
  current_period_end: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  active: "aktiv",
  trialing: "aktiv (Testphase)",
  canceled: "gekündigt",
  incomplete: "inaktiv",
  incomplete_expired: "inaktiv",
  past_due: "Zahlung ausstehend",
  unpaid: "inaktiv",
  paused: "pausiert",
};

const PLAN_LABELS: Record<string, string> = {
  monthly: "Monatlich (7,50 € / Monat)",
  yearly: "Jährlich (89,99 € / Jahr)",
};

function formatDate(value: string | null) {
  if (!value) return "–";
  return new Date(value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function KontoClient() {
  // undefined = wird noch geladen, null = ausgeloggt
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [subscription, setSubscription] = useState<SubscriptionRow | null | undefined>(undefined);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  useEffect(() => {
    setCheckoutSuccess(new URLSearchParams(window.location.search).get("checkout") === "success");
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => authSubscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;

    if (!session) {
      setSubscription(null);
      return;
    }

    let cancelled = false;
    supabase
      .from("subscriptions")
      .select("status, plan, current_period_end")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setSubscription(data ?? null);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  async function handleMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/konto`,
      },
    });

    setAuthLoading(false);

    if (error) {
      setAuthError(error.message);
      return;
    }
    setMagicLinkSent(true);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  async function handleManageSubscription() {
    setPortalError("");
    setPortalLoading(true);

    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
      setPortalError("Nicht eingeloggt.");
      setPortalLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await response.json();

      if (!response.ok || !result.url) {
        throw new Error(result.error ?? "Abo-Verwaltung konnte nicht geöffnet werden.");
      }

      window.location.href = result.url;
    } catch (err) {
      setPortalError(err instanceof Error ? err.message : "Unbekannter Fehler.");
      setPortalLoading(false);
    }
  }

  if (session === undefined) {
    return <p className="text-center text-ink/50">Lädt…</p>;
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-ink/10 bg-white p-8 shadow-[0_10px_40px_rgba(0,0,0,0.06)] sm:p-10">
        {magicLinkSent ? (
          <div className="text-center">
            <p className="font-poppins text-lg font-semibold text-ink">
              Check deine Mails
            </p>
            <p className="mt-2 text-ink/70">
              Wir haben dir einen Anmeldelink an <strong>{email}</strong> geschickt.
              Klick auf den Link, um dich anzumelden.
            </p>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
            <div>
              <h1 className="font-poppins text-2xl font-bold text-ink">
                Anmelden
              </h1>
              <p className="mt-2 text-ink/70">
                Wir schicken dir einen Anmeldelink per E-Mail. Kein Passwort
                nötig.
              </p>
            </div>

            <div className="text-left">
              <label htmlFor="konto-email" className="mb-1 block text-sm font-medium text-ink/60">
                E-Mail-Adresse
              </label>
              <input
                id="konto-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                placeholder="deine@email.de"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-full border border-ink/10 bg-white px-5 py-3.5 text-ink placeholder:text-ink/40 shadow-sm outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/30"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="rounded-full bg-coral px-7 py-3.5 text-center font-semibold text-white shadow-md transition hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {authLoading ? "Wird gesendet…" : "Anmeldelink schicken"}
            </button>

            {authError && (
              <p className="text-sm text-coral" role="alert">
                {authError}
              </p>
            )}
          </form>
        )}
      </div>
    );
  }

  const statusLabel = subscription ? STATUS_LABELS[subscription.status] ?? subscription.status : null;
  const planLabel = subscription?.plan ? PLAN_LABELS[subscription.plan] ?? subscription.plan : null;
  const hasActiveSubscription =
    subscription && (subscription.status === "active" || subscription.status === "trialing");

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-ink/10 bg-white p-8 shadow-[0_10px_40px_rgba(0,0,0,0.06)] sm:p-10">
      {checkoutSuccess && (
        <p className="mb-6 rounded-2xl bg-green/15 px-5 py-4 text-center text-sm font-medium text-ink" role="status">
          Zahlung erfolgreich! Dein Abo wird in Kürze aktiv.
        </p>
      )}

      <h1 className="font-poppins text-2xl font-bold text-ink">Mein Konto</h1>
      <p className="mt-1 text-sm text-ink/50">{session.user.email}</p>

      <div className="mt-6 space-y-3 rounded-2xl bg-ink/[0.03] p-5">
        {subscription === undefined ? (
          <p className="text-ink/60">Abo-Status wird geladen…</p>
        ) : subscription ? (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-ink/50">Status</span>
              <span className="font-semibold text-ink">{statusLabel}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink/50">Plan</span>
              <span className="font-semibold text-ink">{planLabel ?? "–"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink/50">Nächste Abrechnung</span>
              <span className="font-semibold text-ink">
                {formatDate(subscription.current_period_end)}
              </span>
            </div>
          </>
        ) : (
          <div className="text-center">
            <p className="text-ink/70">Du hast noch kein Abo.</p>
            <Link href="/#preise" className="mt-2 inline-block text-sm font-semibold text-blue hover:underline">
              Zu den Preisen →
            </Link>
          </div>
        )}
      </div>

      {hasActiveSubscription && (
        <button
          type="button"
          onClick={handleManageSubscription}
          disabled={portalLoading}
          className="mt-6 w-full rounded-full bg-ink px-7 py-3.5 text-center font-semibold text-white shadow-md transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {portalLoading ? "Wird geöffnet…" : "Abo verwalten"}
        </button>
      )}

      {portalError && (
        <p className="mt-3 text-sm text-coral" role="alert">
          {portalError}
        </p>
      )}

      <button
        type="button"
        onClick={handleLogout}
        className="mt-4 w-full rounded-full border border-ink/10 px-7 py-3 text-center font-semibold text-ink/70 transition hover:bg-ink/5"
      >
        Abmelden
      </button>
    </div>
  );
}
