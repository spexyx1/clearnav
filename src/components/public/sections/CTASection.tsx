import React from 'react';
import { ArrowRight } from 'lucide-react';

interface CTASectionProps {
  content: {
    heading?: string;
    subheading?: string;
    cta_text?: string;
    cta_href?: string;
    secondary_cta_text?: string;
    secondary_cta_href?: string;
    background_style?: 'dark' | 'light' | 'accent';
  };
}

export function CTASection({ content }: CTASectionProps) {
  const {
    heading = 'Ready to Get Started?',
    subheading,
    cta_text,
    cta_href = '/contact',
    secondary_cta_text,
    secondary_cta_href,
    background_style = 'dark',
  } = content;

  const isDark = background_style === 'dark';
  const isAccent = background_style === 'accent';

  const bgStyle = isDark
    ? { backgroundColor: 'var(--color-primary, #0A1628)' }
    : isAccent
    ? { backgroundColor: 'var(--color-secondary, #152238)' }
    : { backgroundColor: 'var(--color-backgroundAlt, #F8F7F4)' };

  return (
    <section className="relative py-24 px-6 overflow-hidden" style={bgStyle}>
      {isDark && (
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 30% 50%, var(--color-accent, #C9A84C) 0%, transparent 60%)',
          }}
        />
      )}

      <div className="relative max-w-3xl mx-auto text-center">
        <h2
          className="text-4xl md:text-5xl font-bold mb-4"
          style={{
            fontFamily: 'var(--font-heading, Georgia, serif)',
            color: isDark || isAccent ? '#FFFFFF' : 'var(--color-text, #0A1628)',
          }}
        >
          {heading}
        </h2>

        <div
          className="w-16 h-0.5 mx-auto my-5"
          style={{ backgroundColor: 'var(--color-accent, #C9A84C)' }}
        />

        {subheading && (
          <p
            className="text-lg leading-relaxed mb-8"
            style={{
              fontFamily: 'var(--font-body, Inter, sans-serif)',
              color: isDark || isAccent ? 'rgba(255,255,255,0.78)' : 'var(--color-textSecondary, #4A5568)',
            }}
          >
            {subheading}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-4">
          {cta_text && (
            <a
              href={cta_href}
              className="inline-flex items-center gap-2 px-8 py-4 text-sm font-semibold tracking-wide rounded transition-all hover:brightness-110 hover:shadow-lg"
              style={{
                backgroundColor: 'var(--color-accent, #C9A84C)',
                color: 'var(--color-primary, #0A1628)',
              }}
            >
              {cta_text}
              <ArrowRight size={16} />
            </a>
          )}
          {secondary_cta_text && (
            <a
              href={secondary_cta_href}
              className="inline-flex items-center gap-2 px-8 py-4 text-sm font-semibold tracking-wide rounded border transition-all hover:bg-white/10"
              style={{
                borderColor: isDark || isAccent ? 'rgba(255,255,255,0.35)' : 'var(--color-primary, #0A1628)',
                color: isDark || isAccent ? '#FFFFFF' : 'var(--color-primary, #0A1628)',
              }}
            >
              {secondary_cta_text}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
