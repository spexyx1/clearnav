import React, { useState } from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

interface ContactSectionProps {
  content: {
    title?: string;
    subtitle?: string;
    email?: string;
    phone?: string;
    address?: string;
    showForm?: boolean;
  };
}

export function ContactSection({ content }: ContactSectionProps) {
  const {
    title = 'Contact Us',
    subtitle = 'Get in touch with our team',
    email,
    phone,
    address,
    showForm = true,
  } = content;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    setTimeout(() => {
      setStatus('sent');
      setFormData({ name: '', email: '', message: '' });
      setTimeout(() => setStatus('idle'), 3000);
    }, 1000);
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
          <p
            className="text-xl max-w-3xl mx-auto"
            style={{
              fontFamily: 'var(--font-body, inherit)',
              color: 'var(--color-text-secondary, #6B7280)',
            }}
          >
            {subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-6">
            {email && (
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'var(--color-primary, #3B82F6)15' }}
                >
                  <Mail size={24} style={{ color: 'var(--color-primary, #3B82F6)' }} />
                </div>
                <div>
                  <h3
                    className="font-semibold text-lg mb-1"
                    style={{ color: 'var(--color-text, #1F2937)' }}
                  >
                    Email
                  </h3>
                  <a
                    href={`mailto:${email}`}
                    className="hover:underline"
                    style={{ color: 'var(--color-text-secondary, #6B7280)' }}
                  >
                    {email}
                  </a>
                </div>
              </div>
            )}

            {phone && (
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'var(--color-primary, #3B82F6)15' }}
                >
                  <Phone size={24} style={{ color: 'var(--color-primary, #3B82F6)' }} />
                </div>
                <div>
                  <h3
                    className="font-semibold text-lg mb-1"
                    style={{ color: 'var(--color-text, #1F2937)' }}
                  >
                    Phone
                  </h3>
                  <a
                    href={`tel:${phone}`}
                    className="hover:underline"
                    style={{ color: 'var(--color-text-secondary, #6B7280)' }}
                  >
                    {phone}
                  </a>
                </div>
              </div>
            )}

            {address && (
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'var(--color-primary, #3B82F6)15' }}
                >
                  <MapPin size={24} style={{ color: 'var(--color-primary, #3B82F6)' }} />
                </div>
                <div>
                  <h3
                    className="font-semibold text-lg mb-1"
                    style={{ color: 'var(--color-text, #1F2937)' }}
                  >
                    Address
                  </h3>
                  <p style={{ color: 'var(--color-text-secondary, #6B7280)' }}>{address}</p>
                </div>
              </div>
            )}
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text, #1F2937)' }}
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
                  style={{
                    borderColor: 'var(--color-primary, #3B82F6)30',
                    focusRingColor: 'var(--color-primary, #3B82F6)',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text, #1F2937)' }}
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
                  style={{
                    borderColor: 'var(--color-primary, #3B82F6)30',
                    focusRingColor: 'var(--color-primary, #3B82F6)',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text, #1F2937)' }}
                >
                  Message
                </label>
                <textarea
                  id="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 resize-none"
                  style={{
                    borderColor: 'var(--color-primary, #3B82F6)30',
                    focusRingColor: 'var(--color-primary, #3B82F6)',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full px-6 py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary, #3B82F6)' }}
              >
                {status === 'sending' ? 'Sending...' : status === 'sent' ? 'Message Sent!' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
