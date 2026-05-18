import React from 'react';

interface TeamMember {
  name: string;
  title: string;
  bio: string;
  image?: string;
}

interface TeamSectionProps {
  content: {
    heading?: string;
    subheading?: string;
    show_divider?: boolean;
    background?: 'white' | 'alt';
    members?: TeamMember[];
  };
}

function Monogram({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className="w-full h-full flex items-center justify-center text-3xl font-semibold tracking-wide"
      style={{
        fontFamily: 'var(--font-heading, Cormorant Garamond, Georgia, serif)',
        backgroundColor: 'var(--color-primary, #1B3A2D)',
        color: 'var(--color-accent, #B8934A)',
      }}
    >
      {initials}
    </div>
  );
}

export function TeamSection({ content }: TeamSectionProps) {
  const {
    heading = 'Our Team',
    subheading,
    show_divider,
    background = 'alt',
    members = [],
  } = content;

  const bgColor =
    background === 'alt'
      ? 'var(--color-backgroundAlt, #F5F2EE)'
      : 'var(--color-background, #FFFFFF)';

  return (
    <section className="py-24 px-6" style={{ backgroundColor: bgColor }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2
            className="text-4xl md:text-5xl font-semibold leading-tight mb-4 tracking-tight"
            style={{
              fontFamily: 'var(--font-heading, Cormorant Garamond, Georgia, serif)',
              color: 'var(--color-text, #1A1A1A)',
            }}
          >
            {heading}
          </h2>
          {show_divider && (
            <div
              className="w-10 h-px mx-auto my-5"
              style={{ backgroundColor: 'var(--color-accent, #B8934A)' }}
            />
          )}
          {subheading && (
            <p
              className="text-lg max-w-2xl mx-auto leading-relaxed font-light"
              style={{
                fontFamily: 'var(--font-body, Nunito Sans, sans-serif)',
                color: 'var(--color-textSecondary, #4A4A4A)',
              }}
            >
              {subheading}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {members.map((member, i) => (
            <div
              key={i}
              className="group flex flex-col items-center text-center p-8 rounded-sm border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              style={{
                borderColor: 'var(--color-border, #E0DBD4)',
                backgroundColor: 'var(--color-background, #FFFFFF)',
              }}
            >
              <div
                className="w-28 h-28 rounded-full overflow-hidden mb-6 flex-shrink-0 ring-4 transition-all duration-300 group-hover:ring-8"
                style={{
                  ringColor: 'var(--color-accent, #B8934A)',
                  boxShadow: '0 0 0 3px var(--color-accent, #B8934A)',
                }}
              >
                {member.image ? (
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover object-top"
                    loading="lazy"
                  />
                ) : (
                  <Monogram name={member.name} />
                )}
              </div>

              <h3
                className="text-2xl font-semibold mb-1 tracking-tight"
                style={{
                  fontFamily: 'var(--font-heading, Cormorant Garamond, Georgia, serif)',
                  color: 'var(--color-text, #1A1A1A)',
                }}
              >
                {member.name}
              </h3>

              <p
                className="text-xs font-semibold uppercase tracking-widest mb-5"
                style={{ color: 'var(--color-accent, #B8934A)' }}
              >
                {member.title}
              </p>

              <div
                className="w-8 h-px mb-5"
                style={{ backgroundColor: 'var(--color-border, #E0DBD4)' }}
              />

              <p
                className="text-sm leading-[1.85] font-light"
                style={{
                  fontFamily: 'var(--font-body, Nunito Sans, sans-serif)',
                  color: 'var(--color-textSecondary, #4A4A4A)',
                }}
              >
                {member.bio}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
