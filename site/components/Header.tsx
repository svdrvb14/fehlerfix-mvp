"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const NAV_LINKS = [
  { href: "/#warum", label: "Warum" },
  { href: "/#team", label: "Team" },
  { href: "/#presse", label: "Presse" },
  { href: "/#preise", label: "Preise" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <header className="relative z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
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

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Menü schließen" : "Menü öffnen"}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/70 shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-md backdrop-saturate-150 transition duration-150 hover:bg-white/90 active:scale-95"
          >
            <div className="flex flex-col gap-[5px]">
              <span
                className={`block h-0.5 w-5 rounded-full bg-ink transition-transform duration-200 ${
                  open ? "translate-y-[6.5px] rotate-45" : ""
                }`}
              />
              <span
                className={`block h-0.5 w-5 rounded-full bg-ink transition-opacity duration-200 ${
                  open ? "opacity-0" : ""
                }`}
              />
              <span
                className={`block h-0.5 w-5 rounded-full bg-ink transition-transform duration-200 ${
                  open ? "-translate-y-[6.5px] -rotate-45" : ""
                }`}
              />
            </div>
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                // Feder statt fester Kurve; Ein- und Ausblenden laufen über
                // denselben Pfad, verankert an der Ecke des Auslöse-Buttons.
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="absolute right-0 mt-3 w-56 origin-top-right overflow-hidden rounded-2xl border border-ink/10 bg-white/80 p-2 shadow-[0_10px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl backdrop-saturate-150"
              >
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-4 py-2.5 text-sm font-medium text-ink/70 transition duration-150 hover:bg-ink/5 hover:text-ink active:bg-ink/10"
                  >
                    {link.label}
                  </a>
                ))}
                <Link
                  href="/konto"
                  onClick={() => setOpen(false)}
                  className="mt-1 block rounded-xl bg-ink px-4 py-2.5 text-center text-sm font-semibold text-white transition duration-150 hover:bg-ink/90 active:scale-[0.98]"
                >
                  Anmelden
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
