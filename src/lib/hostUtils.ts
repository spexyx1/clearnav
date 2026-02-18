/**
 * Hostname and environment utilities
 */

/**
 * Check if a hostname is a local development environment
 */
export function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.16.')
  );
}

/**
 * Extract subdomain from hostname
 * Returns null if no subdomain or if local development
 */
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

/**
 * Check if hostname is a production domain
 */
export function isProductionDomain(hostname: string): boolean {
  return !isLocalHost(hostname) && hostname.includes('.');
}
