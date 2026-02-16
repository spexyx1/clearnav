/**
 * HTML sanitization utilities to prevent XSS attacks
 */

/**
 * Escapes HTML special characters to prevent XSS
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Basic HTML sanitizer that allows only safe tags and attributes
 * For production use, consider using DOMPurify library
 */
export function sanitizeHtml(html: string): string {
  const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'span', 'div'];
  const allowedAttributes = ['href', 'title', 'class'];

  const div = document.createElement('div');
  div.innerHTML = html;

  const walker = document.createTreeWalker(
    div,
    NodeFilter.SHOW_ELEMENT,
    null
  );

  const nodesToRemove: Node[] = [];

  let node: Node | null = walker.currentNode;
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();

      if (!allowedTags.includes(tagName)) {
        nodesToRemove.push(node);
      } else {
        const attrs = Array.from(element.attributes);
        attrs.forEach(attr => {
          if (!allowedAttributes.includes(attr.name.toLowerCase())) {
            element.removeAttribute(attr.name);
          }

          if (attr.name.toLowerCase() === 'href') {
            const href = attr.value;
            if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('mailto:')) {
              element.removeAttribute('href');
            }
          }
        });
      }
    }

    node = walker.nextNode();
  }

  nodesToRemove.forEach(node => {
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
  });

  return div.innerHTML;
}

/**
 * Strips all HTML tags from a string
 */
export function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/**
 * Sanitizes user input for display in text contexts
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .trim();
}

/**
 * Validates and sanitizes URLs
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return '';
    }

    return parsed.href;
  } catch {
    return '';
  }
}
