import { notFound } from 'next/navigation';
import { getTenantByDomain, getTenantPage, type WebsiteContent } from '@/lib/tenants';
import type { Metadata } from 'next';

interface Props {
  params: { domain: string; slug?: string[] };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tenant = await getTenantByDomain(params.domain);
  if (!tenant) return {};

  const pageSlug = params.slug ? `/${params.slug.join('/')}` : '/';
  const result = await getTenantPage(tenant.id, pageSlug);

  return {
    title: result?.page.title ? `${result.page.title} | ${tenant.name}` : tenant.name,
    description: result?.page.meta_description ?? undefined,
  };
}

function str(v: unknown, fallback = ''): string {
  return v != null ? String(v) : fallback;
}

function has(v: unknown): boolean {
  return v != null && v !== '';
}

function renderSection(section: WebsiteContent) {
  const c = section.content as Record<string, unknown>;

  switch (section.section_type) {
    case 'hero':
      return (
        <section key={section.id} className="py-24 px-8 text-center bg-gradient-to-br from-slate-900 to-slate-700 text-white">
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            {str(c.headline, 'Welcome')}
          </h1>
          {has(c.subheadline) && (
            <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
              {str(c.subheadline)}
            </p>
          )}
          {has(c.cta_text) && (
            <a
              href={str(c.cta_url, '#')}
              className="inline-block bg-white text-slate-900 font-semibold px-8 py-3 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {str(c.cta_text)}
            </a>
          )}
        </section>
      );

    case 'features':
      return (
        <section key={section.id} className="py-20 px-8 bg-white">
          <div className="max-w-6xl mx-auto">
            {has(c.title) && (
              <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
                {str(c.title)}
              </h2>
            )}
            {Array.isArray(c.items) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {(c.items as Array<Record<string, unknown>>).map((item, i) => (
                  <div key={i} className="p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {str(item.title)}
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      {str(item.description)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      );

    case 'stats':
      return (
        <section key={section.id} className="py-16 px-8 bg-slate-50">
          <div className="max-w-5xl mx-auto">
            {Array.isArray(c.items) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                {(c.items as Array<Record<string, unknown>>).map((item, i) => (
                  <div key={i}>
                    <div className="text-4xl font-bold text-slate-900">{str(item.value)}</div>
                    <div className="text-sm text-gray-500 mt-1">{str(item.label)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      );

    case 'about':
      return (
        <section key={section.id} className="py-20 px-8 bg-white">
          <div className="max-w-3xl mx-auto text-center">
            {has(c.title) && (
              <h2 className="text-3xl font-bold text-gray-900 mb-6">{str(c.title)}</h2>
            )}
            {has(c.body) && (
              <p className="text-lg text-gray-600 leading-relaxed">{str(c.body)}</p>
            )}
          </div>
        </section>
      );

    case 'contact':
      return (
        <section key={section.id} className="py-20 px-8 bg-slate-50">
          <div className="max-w-2xl mx-auto text-center">
            {has(c.title) && (
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{str(c.title)}</h2>
            )}
            {has(c.email) && (
              <a
                href={`mailto:${str(c.email)}`}
                className="text-blue-600 hover:underline text-lg"
              >
                {str(c.email)}
              </a>
            )}
          </div>
        </section>
      );

    default:
      if (!has(c.headline) && !has(c.body) && !has(c.title)) return null;
      return (
        <section key={section.id} className="py-16 px-8">
          <div className="max-w-4xl mx-auto">
            {has(c.headline) && (
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{str(c.headline)}</h2>
            )}
            {has(c.title) && !has(c.headline) && (
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{str(c.title)}</h2>
            )}
            {has(c.body) && (
              <p className="text-lg text-gray-600 leading-relaxed">{str(c.body)}</p>
            )}
            {has(c.description) && (
              <p className="text-lg text-gray-600 leading-relaxed">{str(c.description)}</p>
            )}
          </div>
        </section>
      );
  }
}

export default async function TenantPage({ params }: Props) {
  const tenant = await getTenantByDomain(params.domain);
  if (!tenant) notFound();

  const pageSlug = params.slug ? `/${params.slug.join('/')}` : '/';
  const result = await getTenantPage(tenant.id, pageSlug);
  if (!result) notFound();

  const { page, sections, theme } = result;

  const primaryColor = theme?.colors?.primary ?? '#1e40af';
  const logoUrl = theme?.logo_url;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ '--primary': primaryColor } as React.CSSProperties}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={tenant.name} className="h-8 w-auto object-contain" />
            ) : (
              <span className="text-xl font-bold text-gray-900">{tenant.name}</span>
            )}
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-600">
            <a href="/" className="hover:text-gray-900 transition-colors">Home</a>
            <a href="/about" className="hover:text-gray-900 transition-colors">About</a>
            <a href="/contact" className="hover:text-gray-900 transition-colors">Contact</a>
          </nav>
        </div>
      </header>

      {/* Page title fallback if no hero section */}
      {sections.every(s => s.section_type !== 'hero') && (
        <div className="bg-slate-900 text-white py-20 px-8 text-center">
          <h1 className="text-5xl font-bold">{page.title}</h1>
          {page.meta_description && (
            <p className="mt-4 text-slate-300 text-lg max-w-2xl mx-auto">
              {page.meta_description}
            </p>
          )}
        </div>
      )}

      {/* Dynamic sections */}
      <main className="flex-1">
        {sections.map(section => renderSection(section))}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-8 text-center text-sm">
        <p className="font-medium text-white mb-1">{tenant.name}</p>
        <p>
          Powered by{' '}
          <a href="https://clearnav.cv" className="text-blue-400 hover:underline">
            ClearNav
          </a>
        </p>
      </footer>
    </div>
  );
}
