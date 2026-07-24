import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { ProblemSection } from "@/components/ProblemSection";
import { SecondCta } from "@/components/SecondCta";
import { TeamSection } from "@/components/TeamSection";

export default function Home() {
  return (
    <main className="relative">
      <Hero />
      <ProblemSection />
      <HowItWorks />
      <TeamSection />
      <SecondCta />
      <Footer />
    </main>
  );
}
