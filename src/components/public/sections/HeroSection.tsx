import React from 'react';

interface HeroSectionProps {
  content: {
    headline?: string;
    subheadline?: string;
    ctaText?: string;
    ctaLink?: string;
    backgroundImage?: string;
    alignment?: 'left' | 'center' | 'right';
  };
}

export function HeroSection({ content }: HeroSectionProps) {
  const {
    headline = 'Welcome',
    subheadline = 'Your trusted partner',
    ctaText = 'Get Started',
    ctaLink = '#contact',
    backgroundImage,
    alignment = 'center',
  } = content;

  const alignmentClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  };

  return (
    <section
      className="relative min-h-[600px] flex items-center justify-center px-6 py-24"
      style={
        backgroundImage
          ? {
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : { backgroundColor: 'var(--color-primary, #3B82F6)' }
      }
    >
      <div className={`max-w-4xl mx-auto flex flex-col ${alignmentClasses[alignment]} gap-6`}>
        <h1
          className="text-5xl md:text-6xl font-bold text-white leading-tight"
          style={{ fontFamily: 'var(--font-heading, inherit)' }}
        >
          {headline}
        </h1>
        <p
          className="text-xl md:text-2xl text-white/90 max-w-2xl"
          style={{ fontFamily: 'var(--font-body, inherit)' }}
        >
          {subheadline}
        </p>
        {ctaText && (
          <a
            href={ctaLink}
            className="inline-block px-8 py-4 text-lg font-semibold text-white rounded-lg transition-all hover:scale-105 hover:shadow-xl mt-4"
            style={{ backgroundColor: 'var(--color-accent, #F59E0B)' }}
          >
            {ctaText}
          </a>
        )}
      </div>
    </section>
  );
}
