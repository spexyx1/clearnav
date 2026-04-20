import React from 'react';
import { ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  content: {
    headline?: string;
    subheadline?: string;
    cta_text?: string;
    cta_href?: string;
    secondary_cta_text?: string;
    secondary_cta_href?: string;
    background_style?: 'dark' | 'light' | 'image';
    background_image?: string;
    alignment?: 'left' | 'center' | 'right';
    show_divider?: boolean;
    badge?: string;
    ctaText?: string;
    ctaLink?: string;
  };
}

export function HeroSection({ content }: HeroSectionProps) {
  const {
    headline = 'Welcome',
    subheadline,
    cta_text,
    cta_href = '/contact',
    secondary_cta_text,
    secondary_cta_href,
    background_style = 'dark',
    background_image,
    alignment = 'center',
    show_divider,
    badge,
    ctaText,
    ctaLink,
  } = content;

  const effectiveCtaText = cta_text || ctaText;
  const effectiveCtaHref = cta_href || ctaLink || '#contact';

  const alignClass =
    alignment === 'left'
      ? 'text-left items-start'
      : alignment === 'right'
      ? 'text-right items-end'
      : 'text-center items-center';

  const isDark = background_style === 'dark' || background_style === 'image';

  const bgStyle: React.CSSProperties = background_image
    ? {
        backgroundImage: `linear-gradient(rgba(27,58,45,0.86), rgba(27,58,45,0.92)), url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : isDark
    ? { backgroundColor: 'var(--color-primary, #1B3A2D)' }
    : { backgroundColor: 'var(--color-backgroundAlt, #F5F2EE)' };

  return (
    <section
      className="relative min-h-[680px] flex items-center justify-center px-6 py-32 overflow-hidden"
      style={bgStyle}
    >
      {isDark && !background_image && (
        <>
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'radial-gradient(ellipse at 75% 45%, var(--color-accent, #B8934A) 0%, transparent 55%)',
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'radial-gradient(ellipse at 20% 70%, var(--color-accentLight, #D4A85C) 0%, transparent 45%)',
            }}
          />
          <div
            className="absolute top-0 left-0 right-0 h-px opacity-20"
            style={{ backgroundColor: 'var(--color-accent, #B8934A)' }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-px opacity-10"
            style={{ backgroundColor: 'var(--color-accent, #B8934A)' }}
          />
        </>
      )}

      <div className={`relative max-w-4xl mx-auto flex flex-col gap-7 ${alignClass}`}>
        {badge && (
          <span
            className="inline-flex items-center px-4 py-1.5 rounded-sm text-xs font-semibold tracking-[0.18em] uppercase border"
            style={{
              color: 'var(--color-accent, #B8934A)',
              borderColor: 'var(--color-accent, #B8934A)',
              backgroundColor: 'rgba(184,147,74,0.08)',
              fontFamily: 'var(--font-body, Nunito Sans, sans-serif)',
            }}
          >
            {badge}
          </span>
        )}

        <h1
          className="text-5xl md:text-6xl lg:text-[4.5rem] font-semibold leading-[1.1] tracking-tight"
          style={{
            fontFamily: 'var(--font-heading, Cormorant Garamond, Georgia, serif)',
            color: isDark ? '#FFFFFF' : 'var(--color-text, #1A1A1A)',
            fontStyle: 'normal',
          }}
        >
          {headline}
        </h1>

        {show_divider && (
          <div
            className="w-12 h-px flex-shrink-0"
            style={{ backgroundColor: 'var(--color-accent, #B8934A)' }}
          />
        )}

        {subheadline && (
          <p
            className="text-lg md:text-xl leading-[1.75] max-w-2xl font-light"
            style={{
              fontFamily: 'var(--font-body, Nunito Sans, sans-serif)',
              color: isDark ? 'rgba(255,255,255,0.78)' : 'var(--color-textSecondary, #4A4A4A)',
            }}
          >
            {subheadline}
          </p>
        )}

        {(effectiveCtaText || secondary_cta_text) && (
          <div className={`flex flex-wrap gap-4 mt-3 ${alignment === 'center' ? 'justify-center' : ''}`}>
            {effectiveCtaText && (
              <a
                href={effectiveCtaHref}
                className="inline-flex items-center gap-2.5 px-8 py-3.5 text-sm font-semibold tracking-wide rounded-sm transition-all duration-200 hover:brightness-110 hover:shadow-lg active:scale-95"
                style={{
                  backgroundColor: 'var(--color-accent, #B8934A)',
                  color: 'var(--color-primary, #1B3A2D)',
                  fontFamily: 'var(--font-body, Nunito Sans, sans-serif)',
                }}
              >
                {effectiveCtaText}
                <ArrowRight size={15} />
              </a>
            )}
            {secondary_cta_text && (
              <a
                href={secondary_cta_href}
                className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold tracking-wide rounded-sm border transition-all duration-200 hover:bg-white/8"
                style={{
                  borderColor: isDark ? 'rgba(255,255,255,0.30)' : 'var(--color-primary, #1B3A2D)',
                  color: isDark ? 'rgba(255,255,255,0.88)' : 'var(--color-primary, #1B3A2D)',
                  fontFamily: 'var(--font-body, Nunito Sans, sans-serif)',
                }}
              >
                {secondary_cta_text}
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
