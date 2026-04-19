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
      ? 'var(--color-backgroundAlt, #F8F7F4)'
      : 'var(--color-background, #FFFFFF)';

  const paragraphs = displayBody.split('\n\n').filter(Boolean);

  const stockImage =
    'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1200';

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
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{
                fontFamily: 'var(--font-heading, Georgia, serif)',
                color: 'var(--color-text, #0A1628)',
              }}
            >
              {displayTitle}
            </h2>

            {show_divider && (
              <div
                className="w-16 h-0.5 mb-6"
                style={{ backgroundColor: 'var(--color-accent, #C9A84C)' }}
              />
            )}

            <div className="space-y-4">
              {paragraphs.map((para, i) => (
                <p
                  key={i}
                  className="text-base leading-relaxed"
                  style={{
                    fontFamily: 'var(--font-body, Inter, sans-serif)',
                    color: 'var(--color-textSecondary, #4A5568)',
                  }}
                >
                  {para}
                </p>
              ))}
            </div>
          </div>

          <div
            className="rounded-lg overflow-hidden shadow-xl"
            style={{ aspectRatio: '4/3' }}
          >
            <img
              src={image || stockImage}
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
