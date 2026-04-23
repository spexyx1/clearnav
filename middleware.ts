export const config = {
  matcher: ['/((?!_vercel|_next/static|_next/image|assets|favicon\\.ico|.*\\..*).*)'],
};

const ROOT_HOSTNAMES = [
  'clearnav.cv',
  'www.clearnav.cv',
  'localhost',
  '127.0.0.1',
];

export default function middleware(req: Request): Response {
  const url = new URL(req.url);
  const hostname = req.headers.get('host') || '';

  // Strip port for comparison
  const host = hostname.split(':')[0].toLowerCase();
  const hostWithoutWww = host.replace(/^www\./, '');

  // Pass through root ClearNav domains and Vercel preview deployments
  const isRoot =
    ROOT_HOSTNAMES.includes(host) ||
    hostWithoutWww === 'clearnav.cv' ||
    host.endsWith('.vercel.app');

  if (isRoot) {
    return new Response(null, { status: 200, headers: { 'x-middleware-next': '1' } });
  }

  // For any other domain (tenant subdomain or custom domain), tag the request
  const response = new Response(null, {
    status: 200,
    headers: {
      'x-middleware-next': '1',
      'x-tenant-domain': hostWithoutWww,
    },
  });

  // Set a short-lived cookie so client-side JS can read the tenant domain
  // without relying on the request header (headers are server-side only)
  const cookieValue = `tenant-domain=${hostWithoutWww}; Path=/; Max-Age=3600; SameSite=Lax`;
  response.headers.append('Set-Cookie', cookieValue);

  return response;
}
