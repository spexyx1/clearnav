import React from 'react';

interface Stat {
  value: string;
  label: string;
}

interface StatsSectionProps {
  content: {
    stats?: Stat[];
    background?: 'accent' | 'dark' | 'light';
  };
}

export function StatsSection({ content }: StatsSectionProps) {
  const { stats = [], background = 'accent' } = content;

  if (stats.length === 0) return null;

  const isDark = background === 'dark';
  const isAccent = background === 'accent';

  const bgStyle =
    isAccent
      ? { backgroundColor: 'var(--color-backgroundAlt, #F5F2EE)' }
      : isDark
      ? { backgroundColor: 'var(--color-primary, #1B3A2D)' }
      : { backgroundColor: 'var(--color-background, #FFFFFF)' };

  return (
    <section className="py-16 px-6" style={bgStyle}>
      <div className="max-w-7xl mx-auto">
        <div
          className={`grid grid-cols-2 md:grid-cols-4 gap-0 divide-x ${
            isDark ? 'divide-white/15' : 'divide-[var(--color-border,#E0DBD4)]'
          }`}
        >
          {stats.map((stat, i) => (
            <div key={i} className={`text-center ${i > 0 ? 'pl-8' : ''} px-6 py-4`}>
              <p
                className="text-3xl md:text-4xl font-semibold mb-1.5 tracking-tight"
                style={{
                  fontFamily: 'var(--font-heading, Cormorant Garamond, Georgia, serif)',
                  color: isDark ? '#FFFFFF' : 'var(--color-primary, #1B3A2D)',
                }}
              >
                {stat.value}
              </p>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{
                  color: isDark
                    ? 'rgba(255,255,255,0.55)'
                    : 'var(--color-textLight, #7A7A7A)',
                }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
