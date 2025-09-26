import * as vscode from "vscode";
import type { BaselineFeature } from "../../core/baselineData";
import type { HoverRenderOptions } from "./types";

export function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}\[\]()#+.!|-]/g, "\\$&").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

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

export function formatLinkHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function makeMarkdownLink(label: string, url: string): string {
  return `[${escapeMarkdown(label)} ↗](${url})`;
}

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

export function formatBaselineDates(feature: BaselineFeature): string {
  const dates = [feature.baselineLowDate, feature.baselineHighDate].filter(Boolean);
  return dates.length ? ` (${dates.join(" → ")})` : "";
}

export function baselineIcon(feature: BaselineFeature, options: HoverRenderOptions): string | undefined {
  if (!options.assetsRoot) {
    return undefined;
  }

  let filename: string;
  let alt: string;
  switch (feature.baseline) {
    case "high":
      filename = "baseline-widely-icon.svg";
      alt = "Baseline Widely available";
      break;
    case "low":
      filename = "baseline-newly-icon.svg";
      alt = "Baseline Newly available";
      break;
    default:
      filename = "baseline-limited-icon.svg";
      alt = "Baseline Limited availability";
      break;
  }

  const iconUri = vscode.Uri.joinPath(options.assetsRoot, filename);
  return `<img src="${iconUri.toString(true)}" width="16" height="9" alt="${alt}" />`;
}