import React from 'react';
import DOMPurify from 'dompurify';

interface CustomSectionProps {
  content: {
    html?: string;
    backgroundColor?: string;
    padding?: 'none' | 'small' | 'medium' | 'large';
  };
}

export function CustomSection({ content }: CustomSectionProps) {
  const { html = '', backgroundColor, padding = 'medium' } = content;

  const paddingClasses = {
    none: 'py-0',
    small: 'py-10',
    medium: 'py-20',
    large: 'py-32',
  };

  const sanitizedHTML = DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'],
  });

  return (
    <section
      className={`px-6 ${paddingClasses[padding]}`}
      style={{ backgroundColor: backgroundColor || 'var(--color-background, #FFFFFF)' }}
    >
      <div className="max-w-7xl mx-auto">
        <div
          className="custom-content"
          dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
        />
      </div>
    </section>
  );
}
