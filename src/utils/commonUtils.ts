/**
 * Common utility functions for various operations
 */

/**
 * Generates a cryptographically secure nonce for CSP
 */
export function generateNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * Checks if two sets have the same values
 */
export function sameSet<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const value of a) {
    if (!b.has(value)) {
      return false;
    }
  }
  return true;
}

/**
 * Normalizes a value to a Date object
 */
export function normalizeToDate(value: string | Date): Date {
  return typeof value === 'string' ? new Date(value) : value;
}

/**
 * Gets filename from a file path
 */
export function getFileName(filePath: string): string {
  return filePath.split('/').pop()?.split('\\').pop() || filePath;
}

/**
 * Highlights text in HTML with a given class
 */
export function highlightHtml(text: string, highlight: string, className: string = 'highlight'): string {
  if (!highlight.trim()) {
    return text;
  }
  
  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, `<span class="${className}">$1</span>`);
}

/**
 * Highlights text with markdown emphasis
 */
export function highlightText(text: string, highlight: string): string {
  if (!highlight.trim()) {
    return text;
  }
  
  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '**$1**');
}