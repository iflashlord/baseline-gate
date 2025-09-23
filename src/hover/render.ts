import * as vscode from "vscode";
import type { BaselineFeature, BrowserKey, SupportStatement } from "../core/baselineData";
import type { Verdict } from "../core/scoring";
import { TARGET_MIN, type Target } from "../core/targets";
import { readBrowserDisplaySettings } from "../extension";

const DESKTOP_BROWSERS: Array<{ key: BrowserKey; label: string }> = [
  { key: "chrome", label: "Chrome" },
  { key: "edge", label: "Edge" },
  { key: "firefox", label: "Firefox" },
  { key: "safari", label: "Safari" }
];

const MOBILE_BROWSERS: Array<{ key: BrowserKey; label: string }> = [
  { key: "chrome_android", label: "Chrome Android" },
  { key: "firefox_android", label: "Firefox Android" },
  { key: "safari_ios", label: "Safari iOS" }
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

function formatDiscouraged(feature: BaselineFeature): string | undefined {
  const info = feature.discouraged;
  if (!info) {
    return undefined;
  }

  const sources = info.accordingTo.map((url) => formatExternalLink(url)).filter(Boolean);
  if (!sources.length) {
    return undefined;
  }

  const sourceLabel = sources.join(" · ");
  const altLabel = info.alternatives?.length
    ? ` · Alternatives: ${info.alternatives.map((alt) => `\`${alt}\``).join(", ")}`
    : "";
  return `$(alert) **Discouraged** — Review guidance from ${sourceLabel}${altLabel}`;
}

function buildSupportSection(feature: BaselineFeature, target: Target): string | undefined {
  const targetMin = TARGET_MIN[target];
  const settings = readBrowserDisplaySettings();
  const sections: string[] = [];

  if (settings.showDesktop) {
    const desktop = renderSupportTable("Desktop support", DESKTOP_BROWSERS, feature.support, targetMin);
    if (desktop) {
      sections.push(desktop);
    }
  }

  if (settings.showMobile) {
    const mobile = renderSupportTable("Mobile support", MOBILE_BROWSERS, feature.support, targetMin);
    if (mobile) {
      sections.push(mobile);
    }
  }

  if (!sections.length) {
    return undefined;
  }

  return sections.join("\n");
}

function renderSupportTable(
  heading: string,
  browsers: Array<{ key: BrowserKey; label: string }>,
  support: BaselineFeature["support"],
  targets: Record<string, number | undefined>
): string | undefined {
  const hasAnyData = browsers.some(
    (browser) => support[browser.key] || targets[browser.key] !== undefined
  );
  if (!hasAnyData) {
    return undefined;
  }

  let table = `**${heading}**\n\n`;
  table += `| Browser | Support | Target | Status |\n| :-- | :--: | :--: | :-- |\n`;

  for (const browser of browsers) {
    const statement = support[browser.key];
    const required = targets[browser.key];
    table += `| ${browser.label} | ${formatSupport(statement)} | ${formatTarget(required)} | ${formatStatus(
      statement,
      required
    )} |\n`;
  }

  table += `\n`;
  return table;
}

function formatSupport(statement: SupportStatement | undefined): string {
  if (!statement?.raw) {
    return "—";
  }

  const release = statement.releaseDate ? ` (${formatReleaseDate(statement.releaseDate)})` : "";
  return `\`${statement.raw}\`${release}`;
}

function formatTarget(value: number | undefined): string {
  if (value === undefined || value === null) {
    return "—";
  }
  return `≥\`${value}\``;
}

function formatStatus(statement: SupportStatement | undefined, required: number | undefined): string {
  if (required === undefined || required === null) {
    return "—";
  }
  if (!statement || typeof statement.version !== "number") {
    return "⚠️ Missing data";
  }
  if (statement.version >= required) {
    return "✅ Meets target";
  }
  return "⛔ Gap";
}

function buildContextItems(feature: BaselineFeature): string[] {
  const items: string[] = [];

  if (feature.groups.length) {
    const groupLabels = feature.groups.map((group) => {
      if (group.parentName && group.parentName !== group.name) {
        return `${group.name} (parent: ${group.parentName})`;
      }
      return group.name;
    });
    items.push(`Groups: ${groupLabels.join(", ")}`);
  }

  if (feature.snapshots.length) {
    const snapshotLabels = feature.snapshots.map((snapshot) => snapshot.name);
    items.push(`Snapshot references: ${snapshotLabels.join(", ")}`);
  }

  if (feature.compatFeatures.length) {
    items.push(`MDN compatibility sources: ${feature.compatFeatures.length}`);
  }

  return items;
}

function buildFallbackTips(feature: BaselineFeature, verdict: Verdict, target: Target): string[] {
  const tips: string[] = [];
  const required = TARGET_MIN[target];

  const missing: string[] = [];
  const gaps: string[] = [];

  for (const browser of DESKTOP_BROWSERS) {
    const min = required[browser.key];
    if (min === undefined || min === null) {
      continue;
    }
    const support = feature.support[browser.key];
    if (!support || typeof support.version !== "number") {
      missing.push(browser.label);
    } else if (support.version < min) {
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

function buildResourceLinks(feature: BaselineFeature): string[] {
  const links: string[] = [];

  if (feature.docsUrl) {
    const args = encodeURIComponent(JSON.stringify({ id: feature.id }));
    links.push(`[Open Baseline details ↗](command:baseline-gate.openDocs?${args})`);
  }

  if (feature.specUrls.length) {
    for (const url of feature.specUrls.slice(0, 2)) {
      const label = `Spec (${formatLinkHostname(url)})`;
      links.push(makeMarkdownLink(label, url));
    }
  }

  if (feature.caniuseIds.length) {
    for (const id of feature.caniuseIds.slice(0, 2)) {
      const url = `https://caniuse.com/${id}`;
      links.push(makeMarkdownLink(`Can I use: ${id}`, url));
    }
  }

  if (feature.discouraged?.accordingTo?.length) {
    for (const source of feature.discouraged.accordingTo.slice(0, 2)) {
      const formatted = formatExternalLink(source);
      if (formatted) {
        links.push(formatted);
      }
    }
  }

  links.push(`[Baseline guide ↗](https://web.dev/articles/baseline-tools-web-features)`);

  return dedupe(links);
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
  return `<img src="${iconUri.toString(true)}" width="16" height="9" alt="${alt}" />`;
}

function formatReleaseDate(date: string): string {
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

function formatLinkHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function makeMarkdownLink(label: string, url: string): string {
  return `[${escapeMarkdown(label)} ↗](${url})`;
}

function formatExternalLink(url: string): string | undefined {
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
