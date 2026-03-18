import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !pageData?.page) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
          <p className="text-gray-600 mb-6">
            The page you're looking for doesn't exist or hasn't been published yet.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
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
