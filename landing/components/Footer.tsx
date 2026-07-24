import Link from "next/link";
import { TricolorBar } from "./TricolorBar";
import { Wordmark } from "./Wordmark";

export function Footer() {
  return (
    <footer className="relative px-6 pb-0 pt-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 pb-12 text-center sm:flex-row sm:justify-between sm:text-left">
        <Wordmark className="text-lg" />

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink/60">
          <Link href="/impressum" className="hover:text-ink">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-ink">
            Datenschutz
          </Link>
          <a
            href="https://instagram.com/fehlerfix_"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink"
          >
            Instagram
          </a>
        </nav>

        <p className="text-sm text-ink/40">© 2026 FehlerFix</p>
      </div>

      <TricolorBar />
    </footer>
  );
}
