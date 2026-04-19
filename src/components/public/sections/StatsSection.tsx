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

  const isDark = background === 'dark' || background === 'accent';

  const bgStyle =
    background === 'accent'
      ? { backgroundColor: 'var(--color-accent, #C9A84C)' }
      : background === 'dark'
      ? { backgroundColor: 'var(--color-primary, #0A1628)' }
      : { backgroundColor: 'var(--color-backgroundAlt, #F8F7F4)' };

  return (
    <section className="py-14 px-6" style={bgStyle}>
      <div className="max-w-7xl mx-auto">
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-8 divide-x ${isDark ? 'divide-white/20' : 'divide-slate-200'}`}>
          {stats.map((stat, i) => (
            <div key={i} className={`text-center ${i > 0 ? 'pl-8' : ''}`}>
              <p
                className="text-3xl md:text-4xl font-bold mb-1"
                style={{
                  fontFamily: 'var(--font-heading, Georgia, serif)',
                  color: background === 'accent' ? 'var(--color-primary, #0A1628)' : '#FFFFFF',
                }}
              >
                {stat.value}
              </p>
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{
                  color:
                    background === 'accent'
                      ? 'rgba(10,22,40,0.65)'
                      : 'rgba(255,255,255,0.65)',
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
