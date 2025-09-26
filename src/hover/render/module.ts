// Main entry point for hover render modules
export { buildFeatureHover } from "./index";
export type { HoverRenderOptions } from "./types";

// Re-export utility functions that might be useful elsewhere
export {
  escapeMarkdown,
  capitalize,
  formatReleaseDate,
  formatLinkHostname,
  makeMarkdownLink,
  formatExternalLink,
  dedupe,
  baselineIcon
} from "./formatUtils";

// Re-export browser configuration
export {
  DESKTOP_BROWSERS,
  MOBILE_BROWSERS,
  getFilteredBrowsers
} from "./browserConfig";

// Re-export content builders
export {
  buildSummaryLines,
  verdictBadge,
  formatBaselineSummary,
  formatDiscouraged,
  buildContextItems,
  buildFallbackTips,
  buildResourceLinks,
  buildHoverContentForGemini
} from "./contentBuilder";

// Re-export support table functions
export {
  buildSupportSection,
  renderSupportTable
} from "./supportTable";