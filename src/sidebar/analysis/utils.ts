import * as vscode from "vscode";

import type { BrowserKey, DiscouragedInfo, SupportStatement, BaselineFeature } from "../../core/baselineData";
import type { Verdict } from "../../core/scoring";
import { TARGET_MIN, type Target } from "../../core/targets";
import { readBrowserDisplaySettings } from "../../extension";
import type { BaselineFinding } from "../workspaceScanner";

import type { BaselineAnalysisAssets, SortOrder, Summary } from "./types";

export const DEFAULT_SEVERITIES: Verdict[] = ["blocked", "warning", "safe"];
export const DEFAULT_SORT_ORDER: SortOrder = "severity";

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

export function getFilteredBrowsers(): Array<{ key: BrowserKey; label: string }> {
  const settings = readBrowserDisplaySettings();
  const browsers: Array<{ key: BrowserKey; label: string }> = [];

  if (settings.showDesktop) {
    browsers.push(...DESKTOP_BROWSERS);
  }

  if (settings.showMobile) {
    browsers.push(...MOBILE_BROWSERS);
  }

  return browsers;
}

export function renderSupportTables(feature: BaselineFinding["feature"], target: Target): string {
  const targetMin = TARGET_MIN[target];
  const settings = readBrowserDisplaySettings();
  const sections: string[] = [];

  if (settings.showDesktop) {
    const desktop = renderSupportTableHtml("Desktop support", DESKTOP_BROWSERS, feature.support, targetMin);
    if (desktop) {
      sections.push(desktop);
    }
  }

  if (settings.showMobile) {
    const mobile = renderSupportTableHtml("Mobile support", MOBILE_BROWSERS, feature.support, targetMin);
    if (mobile) {
      sections.push(mobile);
    }
  }

  if (!sections.length) {
    return "";
  }

  return `<div class="detail-section"><h4>Browser support</h4>${sections.join("")}</div>`;
}

function renderSupportTableHtml(
  heading: string,
  browsers: Array<{ key: BrowserKey; label: string }>,
  support: BaselineFinding["feature"]["support"],
  targetMin: Partial<Record<BrowserKey, number | undefined>>
): string | null {
  const rows = browsers
    .map((browser) => {
      const statement = support[browser.key];
      const required = targetMin[browser.key];
      const hasData = Boolean(statement) || required !== undefined;
      if (!hasData) {
        return null;
      }
      const supportValue = escapeHtml(formatSupportValue(statement));
      const targetValue = required !== undefined ? escapeHtml(`v${required}`) : "—";
      const status = escapeHtml(formatSupportStatus(statement, required));
      return `<tr><th>${escapeHtml(browser.label)}</th><td>${supportValue}</td><td>${targetValue}</td><td>${status}</td></tr>`;
    })
    .filter(Boolean) as string[];

  if (!rows.length) {
    return null;
  }

  return `
    <div class="detail-table">
      <h5>${escapeHtml(heading)}</h5>
      <table>
        <thead><tr><th>Browser</th><th>Support</th><th>Target</th><th>Status</th></tr></thead>
        <tbody>${rows.join("")}</tbody>
      </table>
    </div>
  `;
}

export function sameSet<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const value of a) {
    if (!b.has(value)) {
      return false;
    }
  }
  return true;
}

export function summarize(findings: BaselineFinding[]): Summary {
  let blocked = 0;
  let warning = 0;
  let safe = 0;
  for (const finding of findings) {
    if (finding.verdict === "blocked") {
      blocked += 1;
    } else if (finding.verdict === "warning") {
      warning += 1;
    } else {
      safe += 1;
    }
  }
  return {
    blocked,
    warning,
    safe,
    total: findings.length
  };
}

export function matchesSearch(finding: BaselineFinding, query: string): boolean {
  const tokens = query.split(/\s+/u).filter(Boolean);
  if (!tokens.length) {
    return true;
  }
  const relative = vscode.workspace.asRelativePath(finding.uri, false);
  const haystack = `${finding.feature.name} ${finding.feature.id} ${finding.token} ${finding.lineText} ${relative}`.toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

export function hasActiveFilters(query: string, severities: Set<Verdict>, sortOrder: SortOrder): boolean {
  return Boolean(query) || severities.size !== DEFAULT_SEVERITIES.length || sortOrder !== DEFAULT_SORT_ORDER;
}

export function verdictWeight(verdict: Verdict): number {
  switch (verdict) {
    case "blocked":
      return 3;
    case "warning":
      return 2;
    case "safe":
      return 1;
    default:
      return 0;
  }
}

export function formatVerdict(verdict: Verdict): string {
  switch (verdict) {
    case "blocked":
      return "Blocked";
    case "warning":
      return "Needs review";
    default:
      return "Safe";
  }
}

export function extractExtension(path: string): string {
  const match = path.match(/\.([^.\\/]+)$/);
  return match ? match[1] : "";
}

export function extensionToVariant(extension: string): string {
  const ext = extension.toLowerCase();
  if (ext === "js" || ext === "mjs" || ext === "cjs") {
    return "js";
  }
  if (ext === "ts") {
    return "ts";
  }
  if (ext === "tsx") {
    return "tsx";
  }
  if (ext === "jsx") {
    return "jsx";
  }
  if (ext === "css") {
    return "css";
  }
  if (ext === "scss" || ext === "sass") {
    return "scss";
  }
  return "default";
}

export function formatSupportValue(statement: SupportStatement | undefined): string {
  if (!statement) {
    return "—";
  }
  if (typeof statement.version === "number") {
    return `v${statement.version}`;
  }
  if (statement.raw) {
    return statement.raw;
  }
  return "Unknown";
}

export function formatSupportStatus(statement: SupportStatement | undefined, required: number | undefined): string {
  if (required === undefined) {
    return "—";
  }
  if (!statement || typeof statement.version !== "number") {
    return "Check data";
  }
  if (statement.version >= required) {
    return "Meets target";
  }
  return "Below target";
}

export function formatBaselineSummary(feature: BaselineFinding["feature"]): string {
  if (feature.baseline === "high") {
    return `Baseline: High${formatBaselineDates(feature)}`;
  }
  if (feature.baseline === "low") {
    return `Baseline: Low${formatBaselineDates(feature)}`;
  }
  return "Baseline: Limited availability";
}

export function formatBaselineDates(feature: BaselineFinding["feature"]): string {
  const dates = [feature.baselineLowDate, feature.baselineHighDate].filter(Boolean);
  return dates.length ? ` (${dates.join(" → ")})` : "";
}

export function formatDiscouraged(info: DiscouragedInfo): string {
  const sources = info.accordingTo.join(", ");
  const alternatives = info.alternatives?.length
    ? `; alternatives: ${info.alternatives.map((alt) => `\`${alt}\``).join(", ")}`
    : "";
  return `According to ${sources}${alternatives}`;
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"]|'/g, (match) => {
    switch (match) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return match;
    }
  });
}

export function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

export function generateNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 24; i += 1) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

export function renderSimpleMarkdown(text: string): string {
  const codeBlocks: string[] = [];
  let html = escapeAttribute(text);

  html = html.replace(/```([\s\S]*?)```/g, (_match, codeContent: string) => {
    const token = `__GEMINI_DETAIL_CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(codeContent);
    return token;
  });

  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]+?)`/g, '<code>$1</code>');
  html = html.replace(/\n/g, '<br>');

  codeBlocks.forEach((codeContent, index) => {
    const trimmed = codeContent.replace(/^\n+|\n+$/g, '');
    const blockHtml = [
      '<div class="code-block" data-code-block>',
      '<pre><code>',
      trimmed,
      '</code></pre>',
      '<button type="button" class="code-copy-btn" data-action="copy-code" aria-label="Copy code snippet" title="Copy code snippet">📋</button>',
      '</div>'
    ].join('');
    html = html.replace(`__GEMINI_DETAIL_CODE_BLOCK_${index}__`, blockHtml);
  });

  return html;
}

export function buildGeminiIssueContent(
  finding: BaselineFinding,
  target: Target
): string {
  const feature = finding.feature;
  const relativePath = vscode.workspace.asRelativePath(finding.uri, false);
  const verdictLabel = formatVerdict(finding.verdict);
  const baselineSummary = formatBaselineSummary(feature);

  const parts: string[] = [];

  parts.push(`Feature: ${feature.name}`);
  parts.push(`File: ${relativePath} (line ${finding.range.start.line + 1})`);
  parts.push(`Status: ${verdictLabel} for ${target} targets`);
  parts.push(`Baseline: ${baselineSummary}`);

  if (feature.description) {
    parts.push(`Description: ${feature.description}`);
  }

  const supportInfo: string[] = [];
  const browsers = getFilteredBrowsers();

  for (const browser of browsers) {
    const support = feature.support[browser.key];
    if (support) {
      const version = support.version;
      const raw = support.raw;
      if (raw) {
        supportInfo.push(`${browser.label}: ${raw}`);
      } else if (version) {
        supportInfo.push(`${browser.label}: Since version ${version}`);
      } else {
        supportInfo.push(`${browser.label}: Supported`);
      }
    }
  }

  if (supportInfo.length > 0) {
    parts.push(`Browser Support: ${supportInfo.join(', ')}`);
  }

  parts.push(`Code: ${finding.lineText.trim()}`);

  if (feature.discouraged) {
    parts.push(`Note: This feature is discouraged - ${formatDiscouraged(feature.discouraged)}`);
  }

  return parts.join('\n');
}

export function getBaselineIconHtml(
  feature: BaselineFeature,
  assets: { baselineIcons: BaselineAnalysisAssets["baselineIcons"] },
  webview: vscode.Webview
): string {
  let iconUri: vscode.Uri;
  let alt: string;

  switch (feature.baseline) {
    case "high":
      iconUri = assets.baselineIcons.widely;
      alt = "Baseline Widely available";
      break;
    case "low":
      iconUri = assets.baselineIcons.newly;
      alt = "Baseline Newly available";
      break;
    default:
      iconUri = assets.baselineIcons.limited;
      alt = "Baseline Limited availability";
      break;
  }

  return `<img class="baseline-icon" src="${webview.asWebviewUri(iconUri).toString()}" width="16" height="9" alt="${escapeHtml(alt)}" />`;
}
