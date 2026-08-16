import { BusinessSchoolAftermovie } from "@/components/BusinessSchoolAftermovie";
import { BusinessSchoolCarousel } from "@/components/BusinessSchoolCarousel";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { JourneyPath } from "@/components/JourneyPath";
import { LivingBackground } from "@/components/LivingBackground";
import { MitwirkenSection } from "@/components/MitwirkenSection";
import { PressCarousel } from "@/components/PressCarousel";
import { PricingSection } from "@/components/PricingSection";
import { TeamSection } from "@/components/TeamSection";
import { WhyHowWhat } from "@/components/WhyHowWhat";

export default function Home() {
  return (
    <div className="relative">
      <LivingBackground />
      <JourneyPath />
      <Header />
      <main className="relative">
        <Hero />
        <WhyHowWhat />
        <TeamSection />
        <BusinessSchoolCarousel />
        <BusinessSchoolAftermovie />
        <PressCarousel />
        <PricingSection />
        <MitwirkenSection />
      </main>
      <Footer />
    </div>
  );
}
