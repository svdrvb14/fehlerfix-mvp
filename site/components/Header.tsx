import Image from "next/image";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/#warum", label: "Warum" },
  { href: "/#team", label: "Team" },
  { href: "/#presse", label: "Presse" },
  { href: "/#preise", label: "Preise" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/5 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="relative aspect-[554/472] w-[140px] shrink-0 sm:w-[170px]">
          <Image
            src="/logo.png"
            alt="FehlerFix Logo"
            fill
            priority
            sizes="170px"
            className="object-contain object-left"
          />
        </Link>

        <nav className="flex flex-1 flex-wrap items-center justify-end gap-x-5 gap-y-2 text-sm font-medium text-ink/70">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-ink">
              {link.label}
            </a>
          ))}
          <Link
            href="/konto"
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink/90"
          >
            Anmelden
          </Link>
        </nav>
      </div>
    </header>
  );
}
