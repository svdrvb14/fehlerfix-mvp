import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { SecondCta } from "@/components/SecondCta";
import { TeamSection } from "@/components/TeamSection";

export default function Home() {
  return (
    <main className="relative">
      <Hero />
      <TeamSection />
      <SecondCta />
      <Footer />
    </main>
  );
}
