/**
 * Shared utilities - main entry point
 * Re-exports all utility functions from submodules
 */

// Format utilities
export {
  escapeMarkdown,
  escapeHtml,
  capitalize,
  formatReleaseDate,
  formatLinkHostname,
  makeMarkdownLink,
  formatExternalLink,
  dedupe,
  formatBaselineDates,
  formatTimestamp,
  getRelativePath,
  extractExtension
} from './formatUtils';

// Browser utilities
export {
  DESKTOP_BROWSERS,
  MOBILE_BROWSERS,
  getFilteredBrowsers,
  extensionToVariant
} from './browserUtils';

// Common utilities
export {
  generateNonce,
  sameSet,
  normalizeToDate,
  getFileName,
  highlightHtml,
  highlightText
} from './commonUtils';