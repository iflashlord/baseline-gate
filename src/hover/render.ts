import * as vscode from "vscode";
import type { BaselineFeature } from "../core/baselineData";
import type { Verdict } from "../core/scoring";
import { TARGET_MIN, type Target } from "../core/targets";

const isNullish = (value: unknown): value is null | undefined => value === null || value === undefined;

const BROWSERS: Array<{ key: keyof BaselineFeature["support"]; label: string }> = [
  { key: "chrome", label: "Chrome" },
  { key: "edge", label: "Edge" },
  { key: "firefox", label: "Firefox" },
  { key: "safari", label: "Safari" }
];

export interface HoverRenderOptions {
  assetsRoot?: vscode.Uri;
}

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

  md.appendMarkdown(`---\n\n`);
  md.appendMarkdown(`**Support snapshot**\n\n`);
  md.appendMarkdown(`| Browser | Support | Target | Status |\n| :-- | :--: | :--: | :-- |\n`);
  const targetMin = TARGET_MIN[target];
  for (const browser of BROWSERS) {
    const supportValue = feature.support[browser.key];
    const required = targetMin[browser.key];
    md.appendMarkdown(
      `| ${browser.label} | ${formatSupport(supportValue)} | ${formatTarget(required)} | ${formatStatus(supportValue, required)} |\n`
    );
  }
  md.appendMarkdown(`\n`);

  if (feature.description) {
    md.appendMarkdown(`${feature.description.trim()}\n\n`);
  }

  const tips = buildFallbackTips(feature, verdict, target);
  if (tips.length) {
    md.appendMarkdown(`**Next steps**\n`);
    for (const tip of tips) {
      md.appendMarkdown(`- ${tip}\n`);
    }
    md.appendMarkdown(`\n`);
  }

  const links: string[] = [];
  if (feature.docsUrl) {
    const args = encodeURIComponent(JSON.stringify({ id: feature.id }));
    links.push(`[More info ↗](command:baseline-gate.openDocs?${args})`);
  }
  links.push(`[Baseline guide ↗](https://web.dev/articles/baseline-tools-web-features)`);

  md.appendMarkdown(`---\n\n${links.join(" · ")}\n`);

  return md;
}

function buildSummaryLines(
  feature: BaselineFeature,
  verdict: Verdict,
  target: Target,
  options: HoverRenderOptions
): string[] {
  const lines: string[] = [];
  lines.push(`${verdictBadge(verdict)} for **${capitalize(target)}** targets`);
  lines.push(formatBaselineSummary(feature, options));
  return lines;
}

function verdictBadge(verdict: Verdict): string {
  switch (verdict) {
    case "safe":
      return "$(check) Safe";
    case "warning":
      return "$(warning) Needs review";
    case "blocked":
      return "$(circle-slash) Blocked";
    default:
      return verdict;
  }
}

function formatBaselineSummary(feature: BaselineFeature, options: HoverRenderOptions): string {
  const icon = baselineIcon(feature, options);
  const prefix = icon ? `${icon}&nbsp;` : "";
  if (feature.baseline === "high") {
    return `${prefix}Baseline: **High**${formatBaselineDates(feature)}`;
  }
  if (feature.baseline === "low") {
    return `${prefix}Baseline: **Low**${formatBaselineDates(feature)}`;
  }
  return `${prefix}Baseline: Limited availability`;
}

function formatBaselineDates(feature: BaselineFeature): string {
  const dates = [feature.baselineLowDate, feature.baselineHighDate].filter(Boolean);
  return dates.length ? ` (${dates.join(" → ")})` : "";
}

function formatSupport(value: number | undefined): string {
  return isNullish(value) ? "—" : `\`${value}\``;
}

function formatTarget(value: number | undefined): string {
  return isNullish(value) ? "—" : `≥\`${value}\``;
}

function formatStatus(support: number | undefined, required: number | undefined): string {
  if (isNullish(required)) {
    return "—";
  }
  if (isNullish(support)) {
    return "⚠️ Missing data";
  }
  if (support >= required) {
    return "✅ Meets target";
  }
  return "⛔ Gap";
}

function buildFallbackTips(feature: BaselineFeature, verdict: Verdict, target: Target): string[] {
  const tips: string[] = [];
  const required = TARGET_MIN[target];

  const missing: string[] = [];
  const gaps: string[] = [];

  for (const browser of BROWSERS) {
    const min = required[browser.key];
    if (isNullish(min)) {
      continue;
    }
    const support = feature.support[browser.key];
    if (isNullish(support)) {
      missing.push(browser.label);
    } else if (support < min) {
      gaps.push(`${browser.label} (needs ${min})`);
    }
  }

  if (gaps.length) {
    tips.push(`Progressively enhance for ${gaps.join(", ")} or provide an alternative experience.`);
  }

  if (missing.length) {
    tips.push(`Support data is incomplete for ${missing.join(", ")}; test manually before shipping.`);
  }

  if (feature.baseline === null) {
    tips.push("Not part of Baseline yet; use feature detection or a polyfill for older browsers.");
  }

  if (verdict !== "safe") {
    tips.push("Guard usage with runtime feature detection before relying on it.");
  }

  if (!tips.length) {
    tips.push(`Feature meets the ${capitalize(target)} baseline.`);
  }

  return dedupe(tips);
}

function dedupe(items: string[]): string[] {
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

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}\[\]()#+.!|-]/g, "\\$&").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function baselineIcon(feature: BaselineFeature, options: HoverRenderOptions): string | undefined {
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
  return `<img src="${iconUri.toString(true)}" width="16" height="16" alt="${alt}"/>`;
}
