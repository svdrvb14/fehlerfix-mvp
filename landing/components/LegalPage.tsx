import Link from "next/link";
import type { ReactNode } from "react";
import { AccentDot, BackgroundBlob } from "./BackgroundBlob";
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
    <div className="relative min-h-screen overflow-hidden">
      <BackgroundBlob
        color="coral"
        className="-right-40 -top-40 h-[20rem] w-[20rem] opacity-60"
        speed={0.06}
      />
      <BackgroundBlob
        color="blue"
        className="-left-40 bottom-0 h-[18rem] w-[18rem] opacity-60"
        speed={0.06}
      />
      <AccentDot color="green" className="right-10 top-10 h-2 w-2 opacity-70" />

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
