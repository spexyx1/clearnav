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
      ? 'var(--color-backgroundAlt, #F8F7F4)'
      : 'var(--color-background, #FFFFFF)';

  return (
    <section className="py-24 px-6" style={{ backgroundColor: bgColor }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
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
              className="w-16 h-0.5 mx-auto my-5"
              style={{ backgroundColor: 'var(--color-accent, #C9A84C)' }}
            />
          )}
          {displaySubtitle && (
            <p
              className="text-lg max-w-3xl mx-auto leading-relaxed"
              style={{
                fontFamily: 'var(--font-body, Inter, sans-serif)',
                color: 'var(--color-textSecondary, #4A5568)',
              }}
            >
              {displaySubtitle}
            </p>
          )}
        </div>

        <div className={`grid grid-cols-1 ${colClass} gap-8`}>
          {features.map((feature, index) => {
            const IconComponent = getIcon(feature.icon);
            return (
              <div
                key={index}
                className="group relative p-8 rounded-lg border transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                style={{
                  borderColor: 'var(--color-border, #E2E8F0)',
                  backgroundColor: 'var(--color-background, #FFFFFF)',
                }}
              >
                {feature.badge && (
                  <span
                    className="absolute top-4 right-4 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: 'rgba(201,168,76,0.12)',
                      color: 'var(--color-accent, #C9A84C)',
                    }}
                  >
                    {feature.badge}
                  </span>
                )}

                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-5"
                  style={{ backgroundColor: 'var(--color-primary, #0A1628)' }}
                >
                  <IconComponent size={22} color="var(--color-accent, #C9A84C)" />
                </div>

                <h3
                  className="text-xl font-semibold mb-3"
                  style={{
                    fontFamily: 'var(--font-heading, Georgia, serif)',
                    color: 'var(--color-text, #0A1628)',
                  }}
                >
                  {feature.title}
                </h3>

                <p
                  className="leading-relaxed text-sm"
                  style={{
                    fontFamily: 'var(--font-body, Inter, sans-serif)',
                    color: 'var(--color-textSecondary, #4A5568)',
                  }}
                >
                  {feature.description}
                </p>

                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: 'var(--color-accent, #C9A84C)' }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
