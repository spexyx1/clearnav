import React from 'react';
import DOMPurify from 'dompurify';
import * as Icons from 'lucide-react';

interface CustomSectionProps {
  content: {
    type?: string;
    // html fallback
    html?: string;
    backgroundColor?: string;
    padding?: 'none' | 'small' | 'medium' | 'large';
    // structured types
    heading?: string;
    subheading?: string;
    items?: Array<{ icon?: string; title: string; description: string }>;
    // leadership
    members?: Array<{ name: string; title: string; bio: string; credentials?: string[] }>;
    note?: string;
    // process
    steps?: Array<{ number: string; title: string; description: string }>;
  };
}

function getIcon(name?: string) {
  if (!name) return Icons.CheckCircle;
  return (Icons as Record<string, any>)[name] || Icons.CheckCircle;
}

function LeadershipSection({ content }: { content: CustomSectionProps['content'] }) {
  const { heading, subheading, members = [], note } = content;
  return (
    <section className="py-24 px-6" style={{ backgroundColor: 'var(--color-background, #FFFFFF)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2
            className="text-4xl md:text-5xl font-semibold tracking-tight mb-4 leading-tight"
            style={{ fontFamily: 'var(--font-heading, Cormorant Garamond, Georgia, serif)', color: 'var(--color-text, #1A1A1A)' }}
          >
            {heading}
          </h2>
          <div className="w-10 h-px mx-auto my-5" style={{ backgroundColor: 'var(--color-accent, #B8934A)' }} />
          {subheading && (
            <p
              className="text-lg max-w-2xl mx-auto leading-relaxed font-light"
              style={{ fontFamily: 'var(--font-body, Nunito Sans, sans-serif)', color: 'var(--color-textSecondary, #4A4A4A)' }}
            >
              {subheading}
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {members.map((member, i) => (
            <div
              key={i}
              className="p-8 border"
              style={{ borderColor: 'var(--color-border, #E0DBD4)', borderRadius: '2px' }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-6 text-xl font-semibold"
                style={{
                  backgroundColor: 'var(--color-primary, #1B3A2D)',
                  color: 'var(--color-accent, #B8934A)',
                  fontFamily: 'var(--font-heading, Cormorant Garamond, Georgia, serif)',
                }}
              >
                {member.name.split(' ')[0][0]}
              </div>
              <h3
                className="text-xl font-semibold mb-1"
                style={{ fontFamily: 'var(--font-heading, Cormorant Garamond, Georgia, serif)', color: 'var(--color-text, #1A1A1A)' }}
              >
                {member.name}
              </h3>
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-4"
                style={{ color: 'var(--color-accent, #B8934A)', fontFamily: 'var(--font-body, Nunito Sans, sans-serif)' }}
              >
                {member.title}
              </p>
              <p
                className="text-sm leading-relaxed font-light mb-4"
                style={{ fontFamily: 'var(--font-body, Nunito Sans, sans-serif)', color: 'var(--color-textSecondary, #4A4A4A)' }}
              >
                {member.bio}
              </p>
              {member.credentials && member.credentials.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {member.credentials.map((cred, j) => (
                    <span
                      key={j}
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-sm tracking-wider uppercase"
                      style={{ backgroundColor: 'rgba(184,147,74,0.10)', color: 'var(--color-accent, #B8934A)' }}
                    >
                      {cred}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {note && (
          <p
            className="text-center text-sm mt-10 font-light italic"
            style={{ fontFamily: 'var(--font-body, Nunito Sans, sans-serif)', color: 'var(--color-textLight, #7A7A7A)' }}
          >
            {note}
          </p>
        )}
      </div>
    </section>
  );
}

function GovernanceSection({ content }: { content: CustomSectionProps['content'] }) {
  const { heading, subheading, items = [] } = content;
  return (
    <section className="py-24 px-6" style={{ backgroundColor: 'var(--color-backgroundAlt, #F5F2EE)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2
            className="text-4xl md:text-5xl font-semibold tracking-tight mb-4 leading-tight"
            style={{ fontFamily: 'var(--font-heading, Cormorant Garamond, Georgia, serif)', color: 'var(--color-text, #1A1A1A)' }}
          >
            {heading}
          </h2>
          <div className="w-10 h-px mx-auto my-5" style={{ backgroundColor: 'var(--color-accent, #B8934A)' }} />
          {subheading && (
            <p
              className="text-lg max-w-3xl mx-auto leading-relaxed font-light"
              style={{ fontFamily: 'var(--font-body, Nunito Sans, sans-serif)', color: 'var(--color-textSecondary, #4A4A4A)' }}
            >
              {subheading}
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {items.map((item, i) => {
            const IconComponent = getIcon(item.icon);
            return (
              <div
                key={i}
                className="flex gap-6 p-8 border"
                style={{ borderColor: 'var(--color-border, #E0DBD4)', backgroundColor: 'var(--color-background, #FFFFFF)', borderRadius: '2px' }}
              >
                <div
                  className="w-11 h-11 flex-shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-primary, #1B3A2D)', borderRadius: '2px' }}
                >
                  <IconComponent size={20} color="var(--color-accent, #B8934A)" />
                </div>
                <div>
                  <h3
                    className="text-lg font-semibold mb-2"
                    style={{ fontFamily: 'var(--font-heading, Cormorant Garamond, Georgia, serif)', color: 'var(--color-text, #1A1A1A)' }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed font-light"
                    style={{ fontFamily: 'var(--font-body, Nunito Sans, sans-serif)', color: 'var(--color-textSecondary, #4A4A4A)' }}
                  >
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProcessSection({ content }: { content: CustomSectionProps['content'] }) {
  const { heading, subheading, steps = [] } = content;
  return (
    <section className="py-24 px-6" style={{ backgroundColor: 'var(--color-backgroundAlt, #F5F2EE)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2
            className="text-4xl md:text-5xl font-semibold tracking-tight mb-4 leading-tight"
            style={{ fontFamily: 'var(--font-heading, Cormorant Garamond, Georgia, serif)', color: 'var(--color-text, #1A1A1A)' }}
          >
            {heading}
          </h2>
          <div className="w-10 h-px mx-auto my-5" style={{ backgroundColor: 'var(--color-accent, #B8934A)' }} />
          {subheading && (
            <p
              className="text-lg max-w-3xl mx-auto leading-relaxed font-light"
              style={{ fontFamily: 'var(--font-body, Nunito Sans, sans-serif)', color: 'var(--color-textSecondary, #4A4A4A)' }}
            >
              {subheading}
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-0">
          {steps.map((step, i) => (
            <div
              key={i}
              className="relative p-8 border-t-2"
              style={{ borderTopColor: i === 0 ? 'var(--color-accent, #B8934A)' : 'var(--color-border, #E0DBD4)' }}
            >
              <span
                className="block text-5xl font-semibold mb-4 leading-none"
                style={{ fontFamily: 'var(--font-heading, Cormorant Garamond, Georgia, serif)', color: 'var(--color-border, #E0DBD4)' }}
              >
                {step.number}
              </span>
              <h3
                className="text-lg font-semibold mb-3"
                style={{ fontFamily: 'var(--font-heading, Cormorant Garamond, Georgia, serif)', color: 'var(--color-text, #1A1A1A)' }}
              >
                {step.title}
              </h3>
              <p
                className="text-sm leading-relaxed font-light"
                style={{ fontFamily: 'var(--font-body, Nunito Sans, sans-serif)', color: 'var(--color-textSecondary, #4A4A4A)' }}
              >
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RiskSection({ content }: { content: CustomSectionProps['content'] }) {
  const { heading, subheading, items = [] } = content;
  return (
    <section className="py-24 px-6" style={{ backgroundColor: 'var(--color-background, #FFFFFF)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2
            className="text-4xl md:text-5xl font-semibold tracking-tight mb-4 leading-tight"
            style={{ fontFamily: 'var(--font-heading, Cormorant Garamond, Georgia, serif)', color: 'var(--color-text, #1A1A1A)' }}
          >
            {heading}
          </h2>
          <div className="w-10 h-px mx-auto my-5" style={{ backgroundColor: 'var(--color-accent, #B8934A)' }} />
          {subheading && (
            <p
              className="text-lg max-w-3xl mx-auto leading-relaxed font-light"
              style={{ fontFamily: 'var(--font-body, Nunito Sans, sans-serif)', color: 'var(--color-textSecondary, #4A4A4A)' }}
            >
              {subheading}
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, i) => {
            const IconComponent = getIcon(item.icon);
            return (
              <div
                key={i}
                className="p-8 border"
                style={{ borderColor: 'var(--color-border, #E0DBD4)', backgroundColor: 'var(--color-backgroundAlt, #F5F2EE)', borderRadius: '2px' }}
              >
                <div
                  className="w-11 h-11 flex items-center justify-center mb-5"
                  style={{ backgroundColor: 'var(--color-primary, #1B3A2D)', borderRadius: '2px' }}
                >
                  <IconComponent size={20} color="var(--color-accent, #B8934A)" />
                </div>
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ fontFamily: 'var(--font-heading, Cormorant Garamond, Georgia, serif)', color: 'var(--color-text, #1A1A1A)' }}
                >
                  {item.title}
                </h3>
                <p
                  className="text-sm leading-relaxed font-light"
                  style={{ fontFamily: 'var(--font-body, Nunito Sans, sans-serif)', color: 'var(--color-textSecondary, #4A4A4A)' }}
                >
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ComplianceSection({ content }: { content: CustomSectionProps['content'] }) {
  const { heading, items = [] } = content;
  return (
    <section className="py-20 px-6" style={{ backgroundColor: 'var(--color-backgroundAlt, #F5F2EE)' }}>
      <div className="max-w-4xl mx-auto">
        <h2
          className="text-2xl font-semibold mb-8 tracking-tight"
          style={{ fontFamily: 'var(--font-heading, Cormorant Garamond, Georgia, serif)', color: 'var(--color-text, #1A1A1A)' }}
        >
          {heading}
        </h2>
        <div className="space-y-6">
          {items.map((item, i) => (
            <div
              key={i}
              className="p-6 border-l-2"
              style={{ borderLeftColor: 'var(--color-accent, #B8934A)', backgroundColor: 'var(--color-background, #FFFFFF)' }}
            >
              <h3
                className="text-base font-semibold mb-1.5"
                style={{ fontFamily: 'var(--font-heading, Cormorant Garamond, Georgia, serif)', color: 'var(--color-text, #1A1A1A)' }}
              >
                {item.title}
              </h3>
              <p
                className="text-sm leading-relaxed font-light"
                style={{ fontFamily: 'var(--font-body, Nunito Sans, sans-serif)', color: 'var(--color-textSecondary, #4A4A4A)' }}
              >
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CustomSection({ content }: CustomSectionProps) {
  const { type, html = '', backgroundColor, padding = 'medium' } = content;

  if (type === 'leadership') return <LeadershipSection content={content} />;
  if (type === 'governance') return <GovernanceSection content={content} />;
  if (type === 'process') return <ProcessSection content={content} />;
  if (type === 'risk') return <RiskSection content={content} />;
  if (type === 'compliance') return <ComplianceSection content={content} />;

  // Fallback: raw HTML
  const paddingClasses = { none: 'py-0', small: 'py-10', medium: 'py-20', large: 'py-32' };
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
        <div className="custom-content" dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />
      </div>
    </section>
  );
}
