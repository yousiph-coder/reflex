import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { MetricsBanner } from "@/components/landing/MetricsBanner";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { IntegrationsGrid } from "@/components/landing/IntegrationsGrid";
import { FeatureHighlights } from "@/components/landing/FeatureHighlights";
import { CtaSection } from "@/components/landing/CtaSection";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased selection:bg-emerald-500/20 selection:text-emerald-400 relative overflow-x-hidden">
      {/* Sticky Global Navigation Bar */}
      <Navbar />

      {/* Main Landing Page Container */}
      <main className="flex-1 flex flex-col w-full">
        {/* 1. Hero Section with Interactive Crash-to-PR Terminal Mockup */}
        <HeroSection />

        {/* 2. Metrics & Social Proof SLA Banner */}
        <MetricsBanner />

        {/* 3. How It Works (3-Step Visual Architecture Breakdown) */}
        <HowItWorks />

        {/* 4. Integration Logos & Ecosystem Tech Badges */}
        <IntegrationsGrid />

        {/* 5. Enterprise Architecture & Guardrails */}
        <FeatureHighlights />

        {/* 6. High-Converting Bottom Call to Action */}
        <CtaSection />
      </main>

      {/* Modern Minimalist Footer */}
      <Footer />
    </div>
  );
}
