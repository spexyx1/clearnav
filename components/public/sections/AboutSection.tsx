import React from 'react';

interface AboutSectionProps {
  content: {
    heading?: string;
    title?: string;
    body?: string;
    text?: string;
    image?: string;
    image_side?: 'left' | 'right';
    imagePosition?: 'left' | 'right';
    show_divider?: boolean;
    background?: 'white' | 'alt';
  };
}

const FALLBACK_IMAGE =
  'https://images.pexels.com/photos/1546912/pexels-photo-1546912.jpeg?auto=compress&cs=tinysrgb&w=1200';

export function AboutSection({ content }: AboutSectionProps) {
  const {
    heading,
    title,
    body,
    text,
    image,
    image_side,
    imagePosition,
    show_divider,
    background = 'white',
  } = content;

  const displayTitle = heading || title || 'About Us';
  const displayBody = body || text || '';
  const effectiveImageSide = image_side || imagePosition || 'right';

  const bgColor =
    background === 'alt'
      ? 'var(--color-backgroundAlt, #F5F2EE)'
      : 'var(--color-background, #FFFFFF)';

  const paragraphs = displayBody.split('\n\n').filter(Boolean);

  return (
    <section className="py-24 px-6" style={{ backgroundColor: bgColor }}>
      <div className="max-w-7xl mx-auto">
        <div
          className={`grid md:grid-cols-2 gap-16 items-center ${
            effectiveImageSide === 'left' ? 'md:[&>*:first-child]:order-2' : ''
          }`}
        >
          <div>
            <h2
              className="text-4xl md:text-5xl font-semibold leading-tight mb-4 tracking-tight"
              style={{
                fontFamily: 'var(--font-heading, Cormorant Garamond, Georgia, serif)',
                color: 'var(--color-text, #1A1A1A)',
              }}
            >
              {displayTitle}
            </h2>

            {show_divider && (
              <div
                className="w-10 h-px mb-7"
                style={{ backgroundColor: 'var(--color-accent, #B8934A)' }}
              />
            )}

            <div className="space-y-5">
              {paragraphs.map((para, i) => (
                <p
                  key={i}
                  className="text-base leading-[1.85] font-light"
                  style={{
                    fontFamily: 'var(--font-body, Nunito Sans, sans-serif)',
                    color: 'var(--color-textSecondary, #4A4A4A)',
                  }}
                >
                  {para}
                </p>
              ))}
            </div>
          </div>

          <div
            className="rounded-sm overflow-hidden shadow-2xl"
            style={{ aspectRatio: '4/3' }}
          >
            <img
              src={image || FALLBACK_IMAGE}
              alt={displayTitle}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
