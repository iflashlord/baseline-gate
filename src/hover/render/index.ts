import * as vscode from "vscode";
import type { BaselineFeature } from "../../core/baselineData";
import type { Target } from "../../core/targets";
import type { Verdict } from "../../core/scoring";
import type { HoverRenderOptions } from "./types";

// Export types for external use
export type { HoverRenderOptions };
import { escapeMarkdown } from "./formatUtils";
import { buildSupportSection } from "./supportTable";
import {
  buildSummaryLines,
  formatDiscouraged,
  buildContextItems,
  buildFallbackTips,
  buildResourceLinks,
  buildHoverContentForGemini
} from "./contentBuilder";

export function buildFeatureHover(
  feature: BaselineFeature,
  verdict: Verdict,
  target: Target,
  options: HoverRenderOptions = {}
): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.isTrusted = true;
  md.supportThemeIcons = true;
  md.supportHtml = true;

  md.appendMarkdown(`**${escapeMarkdown(feature.name)}**\n\n`);

  for (const line of buildSummaryLines(feature, verdict, target, options)) {
    md.appendMarkdown(`> ${line}\n`);
  }
  md.appendMarkdown(`\n`);

  const discouragedNotice = formatDiscouraged(feature);
  if (discouragedNotice) {
    md.appendMarkdown(`> ${discouragedNotice}\n\n`);
  }

  const supportSection = buildSupportSection(feature, target);
  if (supportSection) {
    md.appendMarkdown(`---\n\n`);
    md.appendMarkdown(`${supportSection}\n`);
  }

  if (feature.description) {
    md.appendMarkdown(`${feature.description.trim()}\n\n`);
  }

  const contextItems = buildContextItems(feature);
  if (contextItems.length) {
    md.appendMarkdown(`**Feature context**\n`);
    for (const item of contextItems) {
      md.appendMarkdown(`- ${item}\n`);
    }
    md.appendMarkdown(`\n`);
  }

  const tips = buildFallbackTips(feature, verdict, target);
  if (tips.length) {
    md.appendMarkdown(`**Next steps**\n`);
    for (const tip of tips) {
      md.appendMarkdown(`- ${tip}\n`);
    }
    md.appendMarkdown(`\n`);
  }

  const resources = buildResourceLinks(feature);
  if (resources.length) {
    md.appendMarkdown(`---\n\n**Resources**\n`);
    for (const link of resources) {
      md.appendMarkdown(`- ${link}\n`);
    }
    md.appendMarkdown(`\n`);
  }

  // Add Gemini AI suggestion buttons
  md.appendMarkdown(`---\n\n`);
  const hoverContent = buildHoverContentForGemini(feature, verdict, target);
  
  // Check if there are existing suggestions for this feature/finding
  const hasExistingSuggestions = options.geminiProvider && options.findingId 
    ? options.geminiProvider.hasSuggestionForFinding(options.findingId)
    : false;

  if (hasExistingSuggestions) {
    // Show "View Suggestions" button for existing suggestions
    const viewSuggestionsCommand = `command:baseline-gate.showGeminiSuggestions?${encodeURIComponent(JSON.stringify({
      findingId: options.findingId,
      feature: feature.name
    }))}`;
    md.appendMarkdown(`[$(eye) View Existing Suggestions](${viewSuggestionsCommand}) | `);
  }

  // Always show "Fix with Gemini" button - now works like chat interface
  const geminiCommand = `command:baseline-gate.startGeminiChat?${encodeURIComponent(JSON.stringify({
    initialPrompt: "Fix with Gemini",
    feature: feature.name,
    findingId: options.findingId,
    context: 'hover',
    hoverContent: hoverContent
  }))}`;
  const askGeminiText = hasExistingSuggestions ? "Ask Gemini Again" : "Fix with Gemini";
  md.appendMarkdown(`[$(sparkle) ${askGeminiText}](${geminiCommand})\n\n`);

  return md;
}