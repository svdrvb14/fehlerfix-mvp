"use client";

import { useId, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = "idle" | "loading" | "success" | "duplicate" | "error";

export function WaitlistForm({ className = "" }: { className?: string }) {
  const idPrefix = useId();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [validationError, setValidationError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError("");

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      setValidationError("Bitte gib Vor- und Nachnamen ein.");
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setValidationError("Bitte gib eine gültige E-Mail-Adresse ein.");
      return;
    }

    setStatus("loading");

    const { error } = await supabase.from("waitlist").insert({
      first_name: trimmedFirstName,
      last_name: trimmedLastName,
      email: trimmedEmail,
    });

    if (error) {
      if (error.code === "23505") {
        setStatus("duplicate");
      } else {
        setStatus("error");
      }
      return;
    }

    setStatus("success");
  }

  if (status === "success") {
    return (
      <div
        className={`rounded-2xl bg-green/15 px-6 py-5 text-center font-medium text-ink ${className}`}
        role="status"
      >
        Du bist dabei! Wir melden uns, sobald es losgeht.
      </div>
    );
  }

  if (status === "duplicate") {
    return (
      <div
        className={`rounded-2xl bg-blue-light px-6 py-5 text-center font-medium text-ink ${className}`}
        role="status"
      >
        Du stehst schon auf der Liste!
      </div>
    );
  }

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 text-left">
            <label
              htmlFor={`${idPrefix}-first-name`}
              className="mb-1 block text-sm font-medium text-ink/60"
            >
              Vorname
            </label>
            <input
              id={`${idPrefix}-first-name`}
              type="text"
              autoComplete="given-name"
              required
              placeholder="Vorname"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="w-full rounded-full border border-ink/10 bg-white px-5 py-3.5 text-ink placeholder:text-ink/40 shadow-sm outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/30"
            />
          </div>
          <div className="flex-1 text-left">
            <label
              htmlFor={`${idPrefix}-last-name`}
              className="mb-1 block text-sm font-medium text-ink/60"
            >
              Nachname
            </label>
            <input
              id={`${idPrefix}-last-name`}
              type="text"
              autoComplete="family-name"
              required
              placeholder="Nachname"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="w-full rounded-full border border-ink/10 bg-white px-5 py-3.5 text-ink placeholder:text-ink/40 shadow-sm outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/30"
            />
          </div>
        </div>

        <div className="text-left">
          <label
            htmlFor={`${idPrefix}-email`}
            className="mb-1 block text-sm font-medium text-ink/60"
          >
            E-Mail-Adresse
          </label>
          <input
            id={`${idPrefix}-email`}
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
          disabled={status === "loading"}
          className="rounded-full bg-coral px-7 py-3.5 text-center font-semibold text-white shadow-md transition hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "loading"
            ? "Wird gesendet…"
            : "Jetzt für exklusiven Pre-Access registrieren"}
        </button>
      </form>
      {validationError && (
        <p className="mt-2 text-sm text-coral" role="alert">
          {validationError}
        </p>
      )}
      {status === "error" && (
        <p className="mt-2 text-sm text-coral" role="alert">
          Da ist etwas schiefgelaufen. Bitte versuch es gleich noch einmal.
        </p>
      )}
    </div>
  );
}
