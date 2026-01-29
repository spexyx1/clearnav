import { isValidSubdomain } from './tenantResolver';

export interface SubdomainValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSubdomainFormat(subdomain: string): SubdomainValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!subdomain) {
    errors.push('Subdomain is required');
    return { isValid: false, errors, warnings };
  }

  if (subdomain.length < 3) {
    errors.push('Subdomain must be at least 3 characters long');
  }

  if (subdomain.length > 63) {
    errors.push('Subdomain must be at most 63 characters long');
  }

  if (subdomain !== subdomain.toLowerCase()) {
    errors.push('Subdomain must be all lowercase');
  }

  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    errors.push('Subdomain can only contain lowercase letters, numbers, and hyphens');
  }

  if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
    errors.push('Subdomain cannot start or end with a hyphen');
  }

  if (subdomain.includes('--')) {
    errors.push('Subdomain cannot contain consecutive hyphens');
  }

  const reservedSubdomains = [
    'www',
    'admin',
    'api',
    'app',
    'mail',
    'ftp',
    'localhost',
    'staging',
    'dev',
    'test',
    'demo',
    'support',
    'help',
    'about',
    'contact',
    'blog',
    'docs',
    'status',
    'cdn',
    'static',
    'assets',
    'media',
    'images',
    'files',
  ];

  if (reservedSubdomains.includes(subdomain)) {
    errors.push(`"${subdomain}" is a reserved subdomain and cannot be used`);
  }

  if (subdomain.length < 5) {
    warnings.push('Shorter subdomains (under 5 characters) may be harder for users to remember');
  }

  if (subdomain.includes('-') && subdomain.split('-').length > 3) {
    warnings.push('Subdomains with many hyphens may be difficult to type');
  }

  const isValid = errors.length === 0;

  return { isValid, errors, warnings };
}

export function generateSubdomainSuggestions(companyName: string): string[] {
  const suggestions: string[] = [];

  const sanitized = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (isValidSubdomain(sanitized) && sanitized.length >= 3) {
    suggestions.push(sanitized);
  }

  const words = companyName.toLowerCase().split(/\s+/);
  if (words.length >= 2) {
    const acronym = words.map(w => w[0]).join('');
    if (isValidSubdomain(acronym) && acronym.length >= 3) {
      suggestions.push(acronym);
    }

    const firstTwo = words.slice(0, 2).join('');
    if (isValidSubdomain(firstTwo) && firstTwo.length >= 3) {
      suggestions.push(firstTwo);
    }
  }

  const withSuffixes = ['hq', 'portal', 'app', 'platform', 'hub'];
  for (const suffix of withSuffixes) {
    const withSuffix = `${sanitized}-${suffix}`;
    if (isValidSubdomain(withSuffix) && withSuffix.length <= 63) {
      suggestions.push(withSuffix);
    }
  }

  return [...new Set(suggestions)].slice(0, 5);
}

export function formatSubdomainUrl(subdomain: string, baseDomain: string = 'clearnav.cv'): string {
  return `https://${subdomain}.${baseDomain}`;
}

export function extractSubdomainFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.hostname.split('.');

    if (parts.length >= 3 && parts[0] !== 'www') {
      return parts[0];
    }

    return null;
  } catch {
    return null;
  }
}

export function subdomainToDisplayName(subdomain: string): string {
  return subdomain
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
