import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { resolveTenantFromRequest } from '@/lib/tenantResolver';
import { isLocalHost } from '@/lib/hostUtils';

// Paths that bypass tenant resolution entirely
const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/accept-invitation',
  '/debug',
  '/sales-sheet',
  '/terms',
  '/privacy',
  '/investors',
  '/_next',
  '/api',
  '/favicon.ico',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith('/_next'));
}

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  const { pathname, hostname, searchParams } = request.nextUrl;

  // Skip tenant resolution for static/api/auth paths
  if (isPublicPath(pathname)) {
    return supabaseResponse;
  }

  // Inject tenant resolution header for downstream use
  const tenantParam = searchParams.get('tenant');
  const { createServerClient } = await import('@supabase/ssr');
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll() {},
      },
    }
  );

  const { tenant } = await resolveTenantFromRequest(hostname, tenantParam, supabase);

  // Clone the response and attach resolved tenant header for server components
  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers),
        'x-tenant-id': tenant?.id ?? '',
        'x-tenant-slug': tenant?.slug ?? '',
      }),
    },
  });

  // Copy Supabase session cookies from the SSR response
  supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
    response.cookies.set(name, value, options);
  });

  // Authenticated users: ensure they go to the right portal
  if (user && pathname === '/') {
    // Portal routing is handled client-side by the AuthProvider role
    return response;
  }

  // Unauthenticated users on portal paths → redirect to login
  const portalPaths = ['/client', '/manager', '/platform'];
  const isPortalPath = portalPaths.some((p) => pathname.startsWith(p));
  if (!user && isPortalPath) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    if (isLocalHost(hostname) && tenantParam) loginUrl.searchParams.set('tenant', tenantParam);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
