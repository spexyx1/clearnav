import React from 'react';

interface AboutSectionProps {
  content: {
    title?: string;
    text?: string;
    image?: string;
    imagePosition?: 'left' | 'right';
  };
}

export function AboutSection({ content }: AboutSectionProps) {
  const {
    title = 'About Us',
    text = '',
    image,
    imagePosition = 'right',
  } = content;

  const isImageLeft = imagePosition === 'left';

  return (
    <section className="py-20 px-6" style={{ backgroundColor: 'var(--color-background, #FFFFFF)' }}>
      <div className="max-w-7xl mx-auto">
        <div className={`grid md:grid-cols-2 gap-12 items-center ${isImageLeft ? 'md:flex-row-reverse' : ''}`}>
          <div className={`${isImageLeft ? 'md:order-2' : ''}`}>
            <h2
              className="text-4xl md:text-5xl font-bold mb-6"
              style={{
                fontFamily: 'var(--font-heading, inherit)',
                color: 'var(--color-text, #1F2937)',
              }}
            >
              {title}
            </h2>
            <div
              className="text-lg leading-relaxed prose prose-lg max-w-none"
              style={{
                fontFamily: 'var(--font-body, inherit)',
                color: 'var(--color-text-secondary, #6B7280)',
              }}
              dangerouslySetInnerHTML={{ __html: text }}
            />
          </div>
          {image && (
            <div className={`${isImageLeft ? 'md:order-1' : ''}`}>
              <img
                src={image}
                alt={title}
                className="w-full h-auto rounded-lg shadow-xl"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
