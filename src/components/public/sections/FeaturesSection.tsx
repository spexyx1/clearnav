import React from 'react';
import { Video as LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';

interface Feature {
  icon?: string;
  title: string;
  description: string;
}

interface FeaturesSectionProps {
  content: {
    title?: string;
    subtitle?: string;
    features?: Feature[];
    columns?: number;
  };
}

export function FeaturesSection({ content }: FeaturesSectionProps) {
  const {
    title = 'Our Features',
    subtitle,
    features = [],
    columns = 3,
  } = content;

  const getIcon = (iconName?: string): LucideIcon => {
    if (!iconName) return Icons.Star;
    return (Icons as any)[iconName] || Icons.Star;
  };

  const columnClasses = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  };

  return (
    <section className="py-20 px-6" style={{ backgroundColor: 'var(--color-background, #FFFFFF)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{
              fontFamily: 'var(--font-heading, inherit)',
              color: 'var(--color-text, #1F2937)',
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              className="text-xl max-w-3xl mx-auto"
              style={{
                fontFamily: 'var(--font-body, inherit)',
                color: 'var(--color-text-secondary, #6B7280)',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        <div className={`grid grid-cols-1 ${columnClasses[columns as 2 | 3 | 4] || columnClasses[3]} gap-8`}>
          {features.map((feature, index) => {
            const IconComponent = getIcon(feature.icon);
            return (
              <div
                key={index}
                className="p-6 rounded-lg transition-all hover:shadow-lg border"
                style={{ borderColor: 'var(--color-primary, #3B82F6)20' }}
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'var(--color-primary, #3B82F6)15' }}
                >
                  <IconComponent
                    size={24}
                    style={{ color: 'var(--color-primary, #3B82F6)' }}
                  />
                </div>
                <h3
                  className="text-xl font-semibold mb-2"
                  style={{
                    fontFamily: 'var(--font-heading, inherit)',
                    color: 'var(--color-text, #1F2937)',
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  style={{
                    fontFamily: 'var(--font-body, inherit)',
                    color: 'var(--color-text-secondary, #6B7280)',
                  }}
                >
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
