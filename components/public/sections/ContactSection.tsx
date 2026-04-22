import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface ContactSectionProps {
  content: {
    heading?: string;
    title?: string;
    subheading?: string;
    subtitle?: string;
    email?: string;
    phone?: string;
    address?: string;
    office_hours?: string;
    show_form?: boolean;
    showForm?: boolean;
    form_heading?: string;
    disclaimer?: string;
    show_divider?: boolean;
  };
}

export function ContactSection({ content }: ContactSectionProps) {
  const {
    heading,
    title,
    subheading,
    subtitle,
    email,
    phone,
    address,
    office_hours,
    show_form,
    showForm,
    form_heading = 'Send a Message',
    disclaimer,
    show_divider,
  } = content;

  const displayTitle = heading || title || 'Contact Us';
  const displaySubtitle = subheading || subtitle;
  const displayForm = show_form ?? showForm ?? true;

  const [formData, setFormData] = useState({ name: '', email: '', organization: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    await new Promise((r) => setTimeout(r, 1000));
    setStatus('sent');
    setFormData({ name: '', email: '', organization: '', message: '' });
    setTimeout(() => setStatus('idle'), 5000);
  };

  const contactItems = [
    email && { icon: Mail, label: 'Email', value: email, href: `mailto:${email}` },
    phone && { icon: Phone, label: 'Phone', value: phone, href: `tel:${phone.replace(/\s/g, '')}` },
    address && { icon: MapPin, label: 'Location', value: address, href: undefined },
    office_hours && { icon: Clock, label: 'Office Hours', value: office_hours, href: undefined },
  ].filter(Boolean) as Array<{
    icon: React.ElementType;
    label: string;
    value: string;
    href?: string;
  }>;

  return (
    <section className="py-24 px-6" style={{ backgroundColor: 'var(--color-background, #FFFFFF)' }}>
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

        <div className="grid md:grid-cols-2 gap-12 lg:gap-16">
          <div className="space-y-6">
            {contactItems.map(({ icon: Icon, label, value, href }, i) => (
              <div key={i} className="flex items-start gap-4">
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'var(--color-primary, #0A1628)' }}
                >
                  <Icon size={20} color="var(--color-accent, #C9A84C)" />
                </div>
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-wider mb-0.5"
                    style={{ color: 'var(--color-textLight, #718096)' }}
                  >
                    {label}
                  </p>
                  {href ? (
                    <a
                      href={href}
                      className="font-medium hover:underline"
                      style={{ color: 'var(--color-text, #0A1628)' }}
                    >
                      {value}
                    </a>
                  ) : (
                    <p className="font-medium" style={{ color: 'var(--color-text, #0A1628)' }}>
                      {value}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {disclaimer && (
              <div
                className="mt-8 p-4 rounded-lg border-l-4 text-xs leading-relaxed"
                style={{
                  borderLeftColor: 'var(--color-accent, #C9A84C)',
                  backgroundColor: 'var(--color-backgroundAlt, #F8F7F4)',
                  color: 'var(--color-textLight, #718096)',
                }}
              >
                {disclaimer}
              </div>
            )}
          </div>

          {displayForm && (
            <div>
              {form_heading && (
                <h3
                  className="text-2xl font-bold mb-6"
                  style={{
                    fontFamily: 'var(--font-heading, Georgia, serif)',
                    color: 'var(--color-text, #0A1628)',
                  }}
                >
                  {form_heading}
                </h3>
              )}

              {status === 'sent' ? (
                <div
                  className="flex flex-col items-center justify-center gap-3 p-12 rounded-lg text-center"
                  style={{ backgroundColor: 'var(--color-backgroundAlt, #F8F7F4)' }}
                >
                  <CheckCircle size={40} color="var(--color-accent, #C9A84C)" />
                  <h4
                    className="text-xl font-semibold"
                    style={{ color: 'var(--color-text, #0A1628)' }}
                  >
                    Message Received
                  </h4>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--color-textSecondary, #4A5568)' }}
                  >
                    Thank you for reaching out. Our team will be in touch shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        className="block text-xs font-semibold uppercase tracking-wider mb-2"
                        style={{ color: 'var(--color-textSecondary, #4A5568)' }}
                      >
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
                        style={{
                          borderColor: 'var(--color-border, #E2E8F0)',
                          color: 'var(--color-text, #0A1628)',
                        }}
                        placeholder="Jane Smith"
                      />
                    </div>
                    <div>
                      <label
                        className="block text-xs font-semibold uppercase tracking-wider mb-2"
                        style={{ color: 'var(--color-textSecondary, #4A5568)' }}
                      >
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2"
                        style={{
                          borderColor: 'var(--color-border, #E2E8F0)',
                          color: 'var(--color-text, #0A1628)',
                        }}
                        placeholder="jane@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      className="block text-xs font-semibold uppercase tracking-wider mb-2"
                      style={{ color: 'var(--color-textSecondary, #4A5568)' }}
                    >
                      Organization
                    </label>
                    <input
                      type="text"
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2"
                      style={{
                        borderColor: 'var(--color-border, #E2E8F0)',
                        color: 'var(--color-text, #0A1628)',
                      }}
                      placeholder="Your firm or institution"
                    />
                  </div>

                  <div>
                    <label
                      className="block text-xs font-semibold uppercase tracking-wider mb-2"
                      style={{ color: 'var(--color-textSecondary, #4A5568)' }}
                    >
                      Message *
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 resize-none"
                      style={{
                        borderColor: 'var(--color-border, #E2E8F0)',
                        color: 'var(--color-text, #0A1628)',
                      }}
                      placeholder="Tell us about your inquiry..."
                    />
                  </div>

                  {status === 'error' && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle size={16} />
                      <span>Something went wrong. Please try again.</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="w-full px-6 py-3.5 rounded-lg text-sm font-semibold tracking-wide transition-all hover:brightness-110 disabled:opacity-60"
                    style={{
                      backgroundColor: 'var(--color-accent, #C9A84C)',
                      color: 'var(--color-primary, #0A1628)',
                    }}
                  >
                    {status === 'sending' ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
