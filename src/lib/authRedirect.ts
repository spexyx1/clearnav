import { isLocalHost } from './hostUtils';

export const PLATFORM_ORIGIN = 'https://clearnav.cv';
export const RESET_PATH = '/reset-password';

const DEV_HOST_MARKERS = ['webcontainer', 'stackblitz', 'bolt.new', 'bolt.host', 'local-credentialless'];

export function isClearNavHost(hostname: string): boolean {
  const host = hostname.split(':')[0].toLowerCase();
  return host === 'clearnav.cv' || host.endsWith('.clearnav.cv');
}

function isDevHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return isLocalHost(host) || host.endsWith('.vercel.app') || DEV_HOST_MARKERS.some(m => host.includes(m));
}

// Custom (private label) domains are not on the auth allow list, so their links land on clearnav.cv.
export function authLandingOrigin(): string {
  const { hostname, origin } = window.location;
  return isClearNavHost(hostname) || isDevHost(hostname) ? origin : PLATFORM_ORIGIN;
}

export function getAuthRedirectUrl(returnPath: string): string {
  const returnTo = `${window.location.origin}${returnPath}`;
  return `${authLandingOrigin()}${RESET_PATH}?return=${encodeURIComponent(returnTo)}`;
}
