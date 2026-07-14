const ROOT_HOSTNAMES = ['clearnav.cv', 'www.clearnav.cv'];
const INVOICE_APP_HOSTNAMES = ['invoice.clearnav.cv', 'www.invoice.clearnav.cv'];
const PHONE_APP_HOSTNAMES = ['phone.clearnav.cv', 'www.phone.clearnav.cv'];

export function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.16.')
  );
}

export function extractSubdomain(hostname: string): string | null {
  if (isLocalHost(hostname)) {
    return null;
  }

  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }

  return null;
}

export function isProductionDomain(hostname: string): boolean {
  return !isLocalHost(hostname) && hostname.includes('.');
}

/**
 * Returns true when the current host is the ClearNAV platform root,
 * not a tenant subdomain or custom domain.
 */
export function isPlatformRootDomain(hostname: string): boolean {
  const host = hostname.split(':')[0].toLowerCase().replace(/^www\./, '');
  return (
    isLocalHost(host) ||
    ROOT_HOSTNAMES.some(d => d.replace(/^www\./, '') === host) ||
    host.endsWith('.vercel.app')
  );
}

/**
 * Returns true when the current host is the standalone invoice app subdomain.
 */
export function isInvoiceAppDomain(hostname: string): boolean {
  const host = hostname.split(':')[0].toLowerCase().replace(/^www\./, '');
  return INVOICE_APP_HOSTNAMES.some(d => d.replace(/^www\./, '') === host);
}

/**
 * Returns true when the current host is the standalone phone app subdomain.
 */
export function isPhoneAppDomain(hostname: string): boolean {
  const host = hostname.split(':')[0].toLowerCase().replace(/^www\./, '');
  return PHONE_APP_HOSTNAMES.some(d => d.replace(/^www\./, '') === host);
}

/**
 * Reads the tenant-domain cookie set by Vercel Edge Middleware.
 * Returns null when not present.
 */
export function getTenantDomainCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith('tenant-domain='));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}
