import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { SectionRenderer } from './SectionRenderer';
import {
  PageData,
  readPageCache,
  writePageCache,
  consumeBootstrap,
} from '../../lib/tenantCache';

interface PublicPageRouterProps {
  tenantId: string;
  path: string;
}

function slugFromPath(path: string): string {
  return path === '/' ? 'home' : path.replace(/^\//, '');
}

// Returns cached page data for this slug synchronously if available.
function getInitialPageData(tenantId: string, slug: string): PageData | null {
  const cached = readPageCache(tenantId, slug);
  return cached?.data ?? null;
}

export function PublicPageRouter({ tenantId, path }: PublicPageRouterProps) {
  const slug = slugFromPath(path);
  const [pageData, setPageData] = useState<PageData | null>(() =>
    getInitialPageData(tenantId, slug)
  );
  const [fetchError, setFetchError] = useState(false);
  // Track which slug we last fetched so path changes trigger a reload
  const lastFetchedSlug = useRef<string | null>(null);
  // Bootstrap is consumed once — subsequent path changes use direct fetch
  const bootstrapConsumed = useRef(false);

  useEffect(() => {
    // Reset visible content when navigating to a new page
    if (lastFetchedSlug.current !== null && lastFetchedSlug.current !== slug) {
      const fresh = getInitialPageData(tenantId, slug);
      setPageData(fresh);
      setFetchError(false);
    }

    async function hydrate() {
      // 1. Try bootstrap promise on the very first mount (home page)
      if (!bootstrapConsumed.current && slug === 'home') {
        bootstrapConsumed.current = true;
        const bootstrapPromise = consumeBootstrap();
        if (bootstrapPromise) {
          try {
            const result = await bootstrapPromise;
            if (result && result.tenantId === tenantId && result.slug === slug) {
              setPageData(result.page);
              writePageCache(tenantId, slug, result.page);
              lastFetchedSlug.current = slug;
              return;
            }
          } catch {
            // fall through
          }
        }
      }

      // 2. If cache is fresh, skip network
      const cached = readPageCache(tenantId, slug);
      if (cached && !cached.stale) {
        lastFetchedSlug.current = slug;
        return;
      }

      // 3. Fetch (blocking on first ever visit, background otherwise)
      await fetchPage(slug);
    }

    hydrate();
  }, [tenantId, slug]);

  async function fetchPage(targetSlug: string) {
    try {
      setFetchError(false);

      const { data: page, error: pageError } = await supabase
        .from('site_pages')
        .select('id, slug, title, meta_description')
        .eq('tenant_id', tenantId)
        .eq('slug', targetSlug)
        .eq('is_published', true)
        .maybeSingle();

      if (pageError) throw pageError;

      if (!page) {
        const notFound: PageData = { page: null, sections: [] };
        setPageData(notFound);
        writePageCache(tenantId, targetSlug, notFound);
        lastFetchedSlug.current = targetSlug;
        return;
      }

      const { data: sections, error: sectionsError } = await supabase
        .from('website_content')
        .select('id, section_type, section_order, content')
        .eq('tenant_id', tenantId)
        .eq('page_slug', targetSlug)
        .eq('is_published', true)
        .order('section_order', { ascending: true });

      if (sectionsError) throw sectionsError;

      const fresh: PageData = { page, sections: sections || [] };
      setPageData(fresh);
      writePageCache(tenantId, targetSlug, fresh);
      lastFetchedSlug.current = targetSlug;
    } catch (err) {
      console.error('Error loading page:', err);
      setFetchError(true);
    }
  }

  // Only show the spinner on a genuine first visit when nothing — no bootstrap,
  // no cache — is available. This is the rarest case (first-ever cold load
  // with the bootstrap preload also failing).
  if (!pageData && !fetchError) {
    return (
      <div
        className="min-h-[60vh] flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-background, #FFFFFF)' }}
      >
        <div
          className="w-8 h-8 border border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--color-border, #E0DBD4)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  if (fetchError || !pageData?.page) {
    return (
      <div
        className="min-h-[70vh] flex items-center justify-center px-6"
        style={{ backgroundColor: 'var(--color-background, #FFFFFF)' }}
      >
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

  if (pageData.sections.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--color-text, #1A1A1A)' }}>
            {pageData.page.title}
          </h1>
          <p style={{ color: 'var(--color-textSecondary, #4A4A4A)' }}>This page is under construction.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-page">
      {pageData.sections.map((section) => (
        <SectionRenderer
          key={section.id}
          sectionType={section.section_type}
          content={section.content}
        />
      ))}
    </div>
  );
}
