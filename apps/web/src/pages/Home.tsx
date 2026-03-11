import { PageHead } from '../components/PageHead';

import { Nav } from '../components/home/Nav';
import { Footer } from '../components/home/Footer';
import { HeroSection } from '../components/home/HeroSection';
import { ConceptBar } from '../components/home/ConceptBar';
import { StyleShowcase } from '../components/home/StyleShowcase';
import { AudienceSpotlight } from '../components/home/AudienceSpotlight';
import { FeatureDeepDive } from '../components/home/FeatureDeepDive';
import { ComparisonTable } from '../components/home/ComparisonTable';
import { BuildGallery } from '../components/home/BuildGallery';
import { PricingSection } from '../components/home/PricingSection';
import { FinalCTA } from '../components/home/FinalCTA';

export default function Home() {
  return (
    <div className="min-h-screen bg-brand-bg overflow-x-hidden">
      <PageHead />
      <Nav />
      <HeroSection />
      <ConceptBar />
      <StyleShowcase />
      <AudienceSpotlight />
      <FeatureDeepDive />
      <ComparisonTable />
      <BuildGallery />
      <PricingSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
