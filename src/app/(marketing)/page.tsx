import "./_home/homepage.css";
import { IntroOverlay } from "./_home/intro-overlay";
import { HomepageNav, ScrollProgress } from "./_home/homepage-nav";
import { HeroSection } from "./_home/hero-section";
import { MarqueeSection } from "./_home/marquee-section";
import { StorySection } from "./_home/story-section";
import { GallerySection } from "./_home/gallery-section";
import { DemoSection } from "./_home/demo-section";
import { TestimonialsSection } from "./_home/testimonials-section";
import { ProcessSection } from "./_home/process-section";
import { PricingSection } from "./_home/pricing-section";
import { FinalCtaSection } from "./_home/final-cta-section";
import { HomepageFooter } from "./_home/newsletter-footer";

export const metadata = {
  title: "uwu — Setiap cinta layak diabadikan",
  description:
    "Couture digital invitations, diukir untuk cerita yang layak diabadikan. Didirikan di Jakarta, dicintai di seluruh Nusantara.",
};

export default function HomePage() {
  return (
    <div className="theme-homepage">
      <IntroOverlay />
      <ScrollProgress />
      <HomepageNav />
      <main>
        <HeroSection />
        <MarqueeSection />
        <StorySection />
        <GallerySection />
        <DemoSection />
        <TestimonialsSection />
        <ProcessSection />
        <PricingSection />
        <FinalCtaSection />
      </main>
      <HomepageFooter />
    </div>
  );
}
