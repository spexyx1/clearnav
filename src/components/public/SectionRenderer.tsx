import React from 'react';
import { HeroSection } from './sections/HeroSection';
import { FeaturesSection } from './sections/FeaturesSection';
import { AboutSection } from './sections/AboutSection';
import { ContactSection } from './sections/ContactSection';
import { CustomSection } from './sections/CustomSection';

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

    case 'custom':
      return <CustomSection content={content} />;

    default:
      console.warn(`Unknown section type: ${sectionType}`);
      return null;
  }
}
