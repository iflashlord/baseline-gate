/**
 * Common formatting utilities used across the extension
 */

import type { BaselineFeature } from "../core/baselineData";

/**
 * Escapes markdown special characters
 */
export function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}\[\]()#+.!|-]/g, "\\$&").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Escapes HTML special characters
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Formats a release date string into a readable format
 */
export function formatReleaseDate(date: string): string {
  const timestamp = Date.parse(date);
  if (!Number.isFinite(timestamp)) {
    return date;
  }
  try {
    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(new Date(timestamp));
  } catch {
    return date;
  }
}

/**
 * Formats a URL hostname for display
 */
export function formatLinkHostname(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Creates a markdown link
 */
export function makeMarkdownLink(label: string, url: string): string {
  return `[${escapeMarkdown(label)}](${url})`;
}

/**
 * Formats an external link with its hostname
 */
export function formatExternalLink(url: string): string | undefined {
  if (!url) {
    return undefined;
  }
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");
    return `[${hostname}](${url})`;
  } catch {
    return undefined;
  }
}

/**
 * Removes duplicate items from an array
 */
export function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

/**
 * Formats baseline dates for display
 */
export function formatBaselineDates(feature: BaselineFeature): string {
  const dates = [feature.baselineLowDate, feature.baselineHighDate].filter(Boolean);
  return dates.length ? ` (${dates.join(" → ")})` : "";
}

/**
 * Formats a timestamp for display
 */
export function formatTimestamp(timestamp: Date): string {
  return timestamp.toLocaleString();
}

/**
 * Gets the relative path for display
 */
export function getRelativePath(uri: string, workspaceFolder?: string): string {
  if (workspaceFolder) {
    return uri.replace(workspaceFolder, '').replace(/^[\/\\]/, '');
  }
  return uri.split('/').pop() || uri;
}

/**
 * Extracts file extension from a path
 */
export function extractExtension(path: string): string {
  const match = path.match(/\.([^.\\/]+)$/);
  return match ? match[1] : "";
}