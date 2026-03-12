import { Helmet } from 'react-helmet-async';
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
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          'name': 'BytLinks',
          'applicationCategory': 'BusinessApplication',
          'operatingSystem': 'Web',
          'offers': {
            '@type': 'Offer',
            'price': '0',
            'priceCurrency': 'USD',
          },
          'description': 'Professional link in bio and digital identity platform with business card, analytics, and contact rolodex.',
        })}</script>
      </Helmet>
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
