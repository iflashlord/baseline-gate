import * as vscode from "vscode";
import type { BaselineFeature } from "../../core/baselineData";
import type { Target } from "../../core/targets";
import type { Verdict } from "../../core/scoring";
import type { HoverRenderOptions } from "./types";
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

  // Add Gemini AI suggestion button
  md.appendMarkdown(`---\n\n`);
  const hoverContent = buildHoverContentForGemini(feature, verdict, target);
  const geminiCommand = `command:baseline-gate.askGemini?${encodeURIComponent(JSON.stringify({
    issue: hoverContent,
    feature: feature.name,
    context: 'hover'
  }))}`;
  md.appendMarkdown(`[$(sparkle) Ask Gemini to Fix](${geminiCommand})\n\n`);

  return md;
}