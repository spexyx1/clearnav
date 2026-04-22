import { NextRequest, NextResponse } from 'next/server';

const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'clearnav.cv';

export function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || '';
  const path = req.nextUrl.pathname;

  // Let Next.js internals, API routes, and static files pass through
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.startsWith('/_tenants') ||
    path.includes('.')
  ) {
    return NextResponse.next();
  }

  // Strip www. prefix and port number
  const currentHost = hostname.replace(/^www\./, '').replace(/:\d+$/, '');

  // Root domain and localhost serve the main ClearNav app
  if (currentHost === ROOT_DOMAIN || currentHost === 'localhost' || currentHost === '127.0.0.1') {
    return NextResponse.next();
  }

  // Determine tenant identifier:
  // - subdomain: demo.clearnav.cv  → tenantId = "demo"
  // - custom domain: arklinetrust.com → tenantId = "arklinetrust.com"
  let tenantId: string;
  if (currentHost.endsWith(`.${ROOT_DOMAIN}`)) {
    tenantId = currentHost.slice(0, -(`.${ROOT_DOMAIN}`.length));
  } else {
    tenantId = currentHost;
  }

  const url = req.nextUrl.clone();
  url.pathname = `/_tenants/${tenantId}${path}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
