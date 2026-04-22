import React, { useEffect, useState } from 'react';
import { createClient as _mkClient } from '@/lib/supabase/client';
const supabase = _mkClient();;
import { SectionRenderer } from './SectionRenderer';

interface PageData {
  page: {
    id: string;
    slug: string;
    title: string;
    meta_description: string | null;
  } | null;
  sections: Array<{
    id: string;
    section_type: string;
    section_order: number;
    content: any;
  }>;
}

interface PublicPageRouterProps {
  tenantId: string;
  path: string;
}

export function PublicPageRouter({ tenantId, path }: PublicPageRouterProps) {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPageData();
  }, [tenantId, path]);

  async function loadPageData() {
    try {
      setLoading(true);
      setError(null);

      const pageSlug = path === '/' ? 'home' : path.replace(/^\//, '');

      const { data: page, error: pageError } = await supabase
        .from('site_pages')
        .select('id, slug, title, meta_description')
        .eq('tenant_id', tenantId)
        .eq('slug', pageSlug)
        .eq('is_published', true)
        .maybeSingle();

      if (pageError) throw pageError;

      if (!page) {
        setError('Page not found');
        setPageData({ page: null, sections: [] });
        setLoading(false);
        return;
      }

      const { data: sections, error: sectionsError } = await supabase
        .from('website_content')
        .select('id, section_type, section_order, content')
        .eq('tenant_id', tenantId)
        .eq('page_slug', pageSlug)
        .eq('is_published', true)
        .order('section_order', { ascending: true });

      if (sectionsError) throw sectionsError;

      setPageData({
        page,
        sections: sections || [],
      });
    } catch (err) {
      console.error('Error loading page:', err);
      setError('Failed to load page');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" style={{ backgroundColor: 'var(--color-background, #FFFFFF)' }}>
        <div
          className="w-10 h-10 border border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--color-border, #E0DBD4)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  if (error || !pageData?.page) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6" style={{ backgroundColor: 'var(--color-background, #FFFFFF)' }}>
        <div className="text-center max-w-md">
          <p
            className="text-8xl font-semibold mb-4 tracking-tight"
            style={{ fontFamily: 'var(--font-heading, Georgia, serif)', color: 'var(--color-border, #E0DBD4)' }}
          >
            404
          </p>
          <h2
            className="text-2xl font-semibold mb-3"
            style={{ fontFamily: 'var(--font-heading, Georgia, serif)', color: 'var(--color-text, #1A1A1A)' }}
          >
            Page Not Found
          </h2>
          <p className="mb-8 text-sm" style={{ color: 'var(--color-textSecondary, #4A4A4A)' }}>
            The page you are looking for does not exist or has not been published yet.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 text-sm font-semibold rounded-sm transition-all hover:brightness-110"
            style={{ backgroundColor: 'var(--color-accent, #B8934A)', color: 'var(--color-primary, #1B3A2D)' }}
          >
            Return Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="public-page">
      {pageData.sections.length === 0 ? (
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">{pageData.page.title}</h1>
            <p className="text-gray-600">This page is under construction.</p>
          </div>
        </div>
      ) : (
        <>
          {pageData.sections.map((section) => (
            <SectionRenderer
              key={section.id}
              sectionType={section.section_type}
              content={section.content}
            />
          ))}
        </>
      )}
    </div>
  );
}
