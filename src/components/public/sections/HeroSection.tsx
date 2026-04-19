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

  const alignClass = alignment === 'left' ? 'text-left items-start' : alignment === 'right' ? 'text-right items-end' : 'text-center items-center';
  const isDark = background_style === 'dark' || background_style === 'image';

  const bgStyle: React.CSSProperties = background_image
    ? {
        backgroundImage: `linear-gradient(rgba(10,22,40,0.82), rgba(10,22,40,0.88)), url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : isDark
    ? { backgroundColor: 'var(--color-primary, #0A1628)' }
    : { backgroundColor: 'var(--color-backgroundAlt, #F8F7F4)' };

  return (
    <section
      className="relative min-h-[640px] flex items-center justify-center px-6 py-28 overflow-hidden"
      style={bgStyle}
    >
      {isDark && !background_image && (
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 70% 50%, var(--color-accent, #C9A84C) 0%, transparent 60%)',
          }}
        />
      )}

      <div className={`relative max-w-4xl mx-auto flex flex-col gap-6 ${alignClass}`}>
        {badge && (
          <span
            className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase border"
            style={{
              color: 'var(--color-accent, #C9A84C)',
              borderColor: 'var(--color-accent, #C9A84C)',
              backgroundColor: 'rgba(201,168,76,0.08)',
            }}
          >
            {badge}
          </span>
        )}

        <h1
          className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight"
          style={{
            fontFamily: 'var(--font-heading, Georgia, serif)',
            color: isDark ? '#FFFFFF' : 'var(--color-text, #0A1628)',
          }}
        >
          {headline}
        </h1>

        {show_divider && (
          <div
            className="w-16 h-0.5 flex-shrink-0"
            style={{ backgroundColor: 'var(--color-accent, #C9A84C)' }}
          />
        )}

        {subheadline && (
          <p
            className="text-lg md:text-xl leading-relaxed max-w-2xl"
            style={{
              fontFamily: 'var(--font-body, Inter, sans-serif)',
              color: isDark ? 'rgba(255,255,255,0.82)' : 'var(--color-textSecondary, #4A5568)',
            }}
          >
            {subheadline}
          </p>
        )}

        {(effectiveCtaText || secondary_cta_text) && (
          <div className={`flex flex-wrap gap-4 mt-2 ${alignment === 'center' ? 'justify-center' : ''}`}>
            {effectiveCtaText && (
              <a
                href={effectiveCtaHref}
                className="inline-flex items-center gap-2 px-8 py-4 text-sm font-semibold tracking-wide rounded transition-all hover:brightness-110 hover:shadow-lg"
                style={{
                  backgroundColor: 'var(--color-accent, #C9A84C)',
                  color: 'var(--color-primary, #0A1628)',
                }}
              >
                {effectiveCtaText}
                <ArrowRight size={16} />
              </a>
            )}
            {secondary_cta_text && (
              <a
                href={secondary_cta_href}
                className="inline-flex items-center gap-2 px-8 py-4 text-sm font-semibold tracking-wide rounded border transition-all hover:bg-white/10"
                style={{
                  borderColor: isDark ? 'rgba(255,255,255,0.35)' : 'var(--color-primary, #0A1628)',
                  color: isDark ? '#FFFFFF' : 'var(--color-primary, #0A1628)',
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
