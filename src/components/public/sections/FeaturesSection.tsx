import React from 'react';
import * as Icons from 'lucide-react';

interface Feature {
  icon?: string;
  title: string;
  description: string;
  badge?: string;
}

interface FeaturesSectionProps {
  content: {
    heading?: string;
    title?: string;
    subheading?: string;
    subtitle?: string;
    features?: Feature[];
    columns?: number;
    show_divider?: boolean;
    background?: 'white' | 'alt';
  };
}

export function FeaturesSection({ content }: FeaturesSectionProps) {
  const {
    heading,
    title,
    subheading,
    subtitle,
    features = [],
    columns = 3,
    show_divider,
    background = 'white',
  } = content;

  const displayTitle = heading || title || 'Our Features';
  const displaySubtitle = subheading || subtitle;

  const getIcon = (iconName?: string) => {
    if (!iconName) return Icons.Star;
    return (Icons as Record<string, any>)[iconName] || Icons.Star;
  };

  const colClass =
    columns === 2
      ? 'md:grid-cols-2'
      : columns === 4
      ? 'md:grid-cols-2 lg:grid-cols-4'
      : features.length === 4
      ? 'md:grid-cols-2 lg:grid-cols-4'
      : 'md:grid-cols-2 lg:grid-cols-3';

  const bgColor =
    background === 'alt'
      ? 'var(--color-backgroundAlt, #F5F2EE)'
      : 'var(--color-background, #FFFFFF)';

  return (
    <section className="py-24 px-6" style={{ backgroundColor: bgColor }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2
            className="text-4xl md:text-5xl font-semibold tracking-tight mb-4 leading-tight"
            style={{
              fontFamily: 'var(--font-heading, Cormorant Garamond, Georgia, serif)',
              color: 'var(--color-text, #1A1A1A)',
            }}
          >
            {displayTitle}
          </h2>
          {show_divider && (
            <div
              className="w-10 h-px mx-auto my-5"
              style={{ backgroundColor: 'var(--color-accent, #B8934A)' }}
            />
          )}
          {displaySubtitle && (
            <p
              className="text-lg max-w-3xl mx-auto leading-relaxed font-light"
              style={{
                fontFamily: 'var(--font-body, Nunito Sans, sans-serif)',
                color: 'var(--color-textSecondary, #4A4A4A)',
              }}
            >
              {displaySubtitle}
            </p>
          )}
        </div>

        <div className={`grid grid-cols-1 ${colClass} gap-6`}>
          {features.map((feature, index) => {
            const IconComponent = getIcon(feature.icon);
            return (
              <div
                key={index}
                className="group relative p-8 border transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
                style={{
                  borderColor: 'var(--color-border, #E0DBD4)',
                  backgroundColor: 'var(--color-background, #FFFFFF)',
                  borderRadius: '2px',
                }}
              >
                {feature.badge && (
                  <span
                    className="absolute top-5 right-5 text-[10px] font-semibold px-2.5 py-1 rounded-sm tracking-wider uppercase"
                    style={{
                      backgroundColor: 'rgba(184,147,74,0.10)',
                      color: 'var(--color-accent, #B8934A)',
                    }}
                  >
                    {feature.badge}
                  </span>
                )}

                <div
                  className="w-11 h-11 flex items-center justify-center mb-6"
                  style={{
                    backgroundColor: 'var(--color-primary, #1B3A2D)',
                    borderRadius: '2px',
                  }}
                >
                  <IconComponent size={20} color="var(--color-accent, #B8934A)" />
                </div>

                <h3
                  className="text-xl font-semibold mb-3 leading-snug"
                  style={{
                    fontFamily: 'var(--font-heading, Cormorant Garamond, Georgia, serif)',
                    color: 'var(--color-text, #1A1A1A)',
                  }}
                >
                  {feature.title}
                </h3>

                <p
                  className="leading-relaxed text-sm font-light"
                  style={{
                    fontFamily: 'var(--font-body, Nunito Sans, sans-serif)',
                    color: 'var(--color-textSecondary, #4A4A4A)',
                  }}
                >
                  {feature.description}
                </p>

                <div
                  className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ backgroundColor: 'var(--color-accent, #B8934A)' }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
