import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Pipeline } from "@/components/landing/pipeline";
import { HowItWorks, Metrics, Testimonials, FooterCTA, Footer } from "@/components/landing/sections";

export default function LandingPage() {
  return (
    <main className="relative overflow-x-hidden">
      <Navbar />
      <Hero />
      <Features />
      <Pipeline />
      <HowItWorks />
      <Metrics />
      <Testimonials />
      <FooterCTA />
      <Footer />
    </main>
  );
}
