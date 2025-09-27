import * as vscode from "vscode";
import type { BaselineFeature } from "../../core/baselineData";
import type { HoverRenderOptions } from "./types";

// Re-export shared utilities for compatibility
export { 
  escapeMarkdown, 
  capitalize, 
  formatReleaseDate, 
  formatLinkHostname,
  makeMarkdownLink,
  formatExternalLink,
  dedupe,
  formatBaselineDates
} from "../../utils";

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