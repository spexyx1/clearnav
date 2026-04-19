import React from 'react';
import { HeroSection } from './sections/HeroSection';
import { FeaturesSection } from './sections/FeaturesSection';
import { AboutSection } from './sections/AboutSection';
import { ContactSection } from './sections/ContactSection';
import { CustomSection } from './sections/CustomSection';
import { StatsSection } from './sections/StatsSection';
import { CTASection } from './sections/CTASection';

interface SectionRendererProps {
  sectionType: string;
  content: any;
}

export function SectionRenderer({ sectionType, content }: SectionRendererProps) {
  switch (sectionType) {
    case 'hero':
      return <HeroSection content={content} />;
    case 'features':
      return <FeaturesSection content={content} />;
    case 'about':
      return <AboutSection content={content} />;
    case 'contact':
      return <ContactSection content={content} />;
    case 'stats':
      return <StatsSection content={content} />;
    case 'cta':
      return <CTASection content={content} />;
    case 'custom':
      return <CustomSection content={content} />;
    default:
      return null;
  }
}
