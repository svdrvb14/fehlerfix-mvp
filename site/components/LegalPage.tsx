import Link from "next/link";
import type { ReactNode } from "react";
import { LivingBackground } from "./LivingBackground";
import { TricolorBar } from "./TricolorBar";
import { Wordmark } from "./Wordmark";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      <LivingBackground subtle />

      <div className="mx-auto max-w-3xl px-6 pb-24 pt-10">
        <Link href="/" className="inline-block">
          <Wordmark className="text-lg" />
        </Link>

        <h1 className="mt-10 font-poppins text-3xl font-bold text-ink sm:text-4xl">
          {title}
        </h1>

        <div className="prose-legal mt-8 space-y-6 leading-relaxed text-ink/80">
          {children}
        </div>

        <Link
          href="/"
          className="mt-14 inline-block text-sm font-semibold text-blue hover:underline"
        >
          ← Zurück zur Startseite
        </Link>
      </div>

      <TricolorBar />
    </div>
  );
}
