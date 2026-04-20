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
    ? { backgroundColor: 'var(--color-primary, #1B3A2D)' }
    : isAccent
    ? { backgroundColor: 'var(--color-secondary, #244D3C)' }
    : { backgroundColor: 'var(--color-backgroundAlt, #F5F2EE)' };

  return (
    <section className="relative py-28 px-6 overflow-hidden" style={bgStyle}>
      {(isDark || isAccent) && (
        <>
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'radial-gradient(ellipse at 30% 50%, var(--color-accent, #B8934A) 0%, transparent 60%)',
            }}
          />
          <div
            className="absolute top-0 left-0 right-0 h-px opacity-15"
            style={{ backgroundColor: 'var(--color-accent, #B8934A)' }}
          />
        </>
      )}

      <div className="relative max-w-3xl mx-auto text-center">
        <h2
          className="text-4xl md:text-5xl font-semibold tracking-tight mb-4 leading-tight"
          style={{
            fontFamily: 'var(--font-heading, Cormorant Garamond, Georgia, serif)',
            color: isDark || isAccent ? '#FFFFFF' : 'var(--color-text, #1A1A1A)',
          }}
        >
          {heading}
        </h2>

        <div
          className="w-10 h-px mx-auto my-6"
          style={{ backgroundColor: 'var(--color-accent, #B8934A)' }}
        />

        {subheading && (
          <p
            className="text-lg leading-relaxed mb-10 font-light"
            style={{
              fontFamily: 'var(--font-body, Nunito Sans, sans-serif)',
              color: isDark || isAccent ? 'rgba(255,255,255,0.75)' : 'var(--color-textSecondary, #4A4A4A)',
            }}
          >
            {subheading}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-4">
          {cta_text && (
            <a
              href={cta_href}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 text-sm font-semibold tracking-wide rounded-sm transition-all duration-200 hover:brightness-110 hover:shadow-lg active:scale-95"
              style={{
                backgroundColor: 'var(--color-accent, #B8934A)',
                color: 'var(--color-primary, #1B3A2D)',
                fontFamily: 'var(--font-body, Nunito Sans, sans-serif)',
              }}
            >
              {cta_text}
              <ArrowRight size={15} />
            </a>
          )}
          {secondary_cta_text && (
            <a
              href={secondary_cta_href}
              className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold tracking-wide rounded-sm border transition-all duration-200 hover:bg-white/8"
              style={{
                borderColor: isDark || isAccent ? 'rgba(255,255,255,0.30)' : 'var(--color-primary, #1B3A2D)',
                color: isDark || isAccent ? 'rgba(255,255,255,0.88)' : 'var(--color-primary, #1B3A2D)',
                fontFamily: 'var(--font-body, Nunito Sans, sans-serif)',
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
