import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LivingBackground } from "@/components/LivingBackground";
import { KontoClient } from "@/components/KontoClient";

export const metadata: Metadata = {
  title: "Mein Konto – FehlerFix",
};

export default function KontoPage() {
  return (
    <div className="relative">
      <LivingBackground />
      <Header />
      <main className="px-6 py-16 sm:py-24">
        <KontoClient />
      </main>
      <Footer />
    </div>
  );
}
