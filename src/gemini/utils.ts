// Import and re-export shared utilities
import { generateNonce, escapeHtml, normalizeToDate, getFileName, highlightHtml as utilsHighlightHtml, highlightText as utilsHighlightText } from "../utils";

// Create aliases for consistency with existing code
export { generateNonce as getNonce, escapeHtml, normalizeToDate, getFileName };

export function escapeRegExp(value: string): string {
  return value.replace(/[-\^$*+?.()|[\]{}]/g, '\\$&');
}

export function buildSearchPatterns(query?: string): RegExp[] {
  if (!query) {
    return [];
  }

  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return [];
  }

  const uniqueTerms = Array.from(new Set(terms.map(term => term.toLowerCase())));
  return uniqueTerms.map(term => new RegExp(escapeRegExp(term), 'gi'));
}

export function highlightText(text: string, query: string): string {
  const safeText = escapeHtml(text);
  const patterns = buildSearchPatterns(query);

  if (patterns.length === 0) {
    return safeText;
  }

  return patterns.reduce((result, pattern) => result.replace(pattern, '<mark>$&</mark>'), safeText);
}

export function highlightHtml(html: string, query?: string): string {
  const patterns = buildSearchPatterns(query);

  if (patterns.length === 0) {
    return html;
  }

  return html.replace(/>([^<]+)</g, (match, text) => {
    let updated = text;
    for (const pattern of patterns) {
      updated = updated.replace(pattern, '<mark>$&</mark>');
    }
    return '>' + updated + '<';
  });
}

export function formatTimestamp(value: Date | string): { display: string; iso: string } {
  const date = normalizeToDate(value);

  if (Number.isNaN(date.getTime())) {
    return { display: 'Unknown date', iso: '' };
  }

  return {
    display: date.toLocaleString(),
    iso: date.toISOString(),
  };
}
