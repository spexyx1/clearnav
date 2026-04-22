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
  if (isLocalHost(hostname)) return null;
  const parts = hostname.split('.');
  if (parts.length >= 3) return parts[0];
  return null;
}

export function isProductionDomain(hostname: string): boolean {
  return !isLocalHost(hostname) && hostname.includes('.');
}
