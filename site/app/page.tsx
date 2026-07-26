import { BusinessSchoolCarousel } from "@/components/BusinessSchoolCarousel";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { LivingBackground } from "@/components/LivingBackground";
import { PressCarousel } from "@/components/PressCarousel";
import { PricingSection } from "@/components/PricingSection";
import { TeamSection } from "@/components/TeamSection";
import { WhyHowWhat } from "@/components/WhyHowWhat";

export default function Home() {
  return (
    <div className="relative">
      <LivingBackground />
      <Header />
      <main className="relative">
        <Hero />
        <WhyHowWhat />
        <TeamSection />
        <BusinessSchoolCarousel />
        <PressCarousel />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
