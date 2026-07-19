import dynamic from "next/dynamic";
import { NavBar } from "@/components/landing/nav-bar";
import { Preloader } from "@/components/landing/ui/preloader";
import { Footer } from "@/components/landing/footer";
import { DecorLayer } from "@/components/landing/decor/decor-layer";

// ABOVE-FOLD SECTIONS — Server-rendered for SEO
import { HeroSectionShell } from "@/sections/server/hero-section-shell";
import { ReelSectionShell } from "@/sections/server/reel-section-shell";
import { IntroSectionShell } from "@/sections/server/intro-section-shell";
import { FaqSection } from "@/sections/server/faq-section";

// BELOW-FOLD SECTIONS — Lazy loaded (chunked out of initial JS)
const GenesisSection = dynamic(() => import("@/sections/genesis-section").then((m) => m.GenesisSection));
const ForgeSection = dynamic(() => import("@/sections/forge-section").then((m) => m.ForgeSection));
const WorkflowSection = dynamic(() => import("@/sections/workflow-section").then((m) => m.WorkflowSection));
const DirectorSection = dynamic(() => import("@/sections/director-section").then((m) => m.DirectorSection));
const GallerySection = dynamic(() => import("@/sections/gallery-section").then((m) => m.GallerySection));
const EcosystemSection = dynamic(() => import("@/sections/ecosystem-section").then((m) => m.EcosystemSection));
const StatsSection = dynamic(() => import("@/sections/stats-section").then((m) => m.StatsSection));
const PortalSection = dynamic(() => import("@/sections/portal-section").then((m) => m.PortalSection));

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-[#16141a] text-white overflow-x-hidden">
      {/* Cinematic Full Screen Preloader Intro */}
      <Preloader />

      {/* Global Decor Layer (Includes ScrollSnapController, Particles, Cursor, BackToTop, etc) */}
      <DecorLayer />

      {/* Navigation */}
      <NavBar />

      {/* Above-fold — Server rendered */}
      <HeroSectionShell />
      <ReelSectionShell />
      <IntroSectionShell />

      {/* Below-fold — Lazy loaded */}
      <GenesisSection />
      <ForgeSection />
      <WorkflowSection />
      <DirectorSection />
      <GallerySection />
      <EcosystemSection />
      <StatsSection />

      {/* FAQ — server rendered for SEO + FAQPage schema (GEO) */}
      <FaqSection />

      <PortalSection />

      {/* Footer */}
      <Footer />
    </main>
  );
}
