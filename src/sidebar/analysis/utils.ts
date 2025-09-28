import * as vscode from "vscode";

import type { BrowserKey, DiscouragedInfo, SupportStatement, BaselineFeature } from "../../core/baselineData";
import type { Verdict } from "../../core/scoring";
import { TARGET_MIN, type Target } from "../../core/targets";
import { readBrowserDisplaySettings } from "../../extension";
import type { BaselineFinding } from "../workspaceScanner";
import { 
  DESKTOP_BROWSERS, 
  MOBILE_BROWSERS, 
  getFilteredBrowsers, 
  capitalize, 
  escapeHtml, 
  generateNonce,
  extractExtension,
  extensionToVariant,
  formatBaselineDates,
  sameSet
} from "../../utils";

import type {
  BaselineAnalysisAssets,
  FeatureGroupRollup,
  FindingsStatistics,
  SortOrder,
  Summary
} from "./types";

export const DEFAULT_SEVERITIES: Verdict[] = ["blocked", "warning", "safe"];
export const DEFAULT_SORT_ORDER: SortOrder = "severity";

// Re-export browser utilities for convenience
export { DESKTOP_BROWSERS, MOBILE_BROWSERS, getFilteredBrowsers };

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

// Re-export from shared utils
export { sameSet } from "../../utils";

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

export function computeFindingsStatistics(findings: BaselineFinding[]): FindingsStatistics {
  const totals: FindingsStatistics = {
    wins: 0,
    blocked: 0,
    warning: 0,
    total: findings.length,
    groups: []
  };

  const groupMap = new Map<string, FeatureGroupRollup>();

  const ensureGroup = (id: string, name: string): FeatureGroupRollup => {
    const existing = groupMap.get(id);
    if (existing) {
      return existing;
    }
    const created: FeatureGroupRollup = {
      id,
      name,
      blocked: 0,
      warning: 0,
      safe: 0,
      total: 0
    };
    groupMap.set(id, created);
    return created;
  };

  const addToGroup = (group: FeatureGroupRollup, verdict: Verdict) => {
    group.total += 1;
    if (verdict === "blocked") {
      group.blocked += 1;
    } else if (verdict === "warning") {
      group.warning += 1;
    } else {
      group.safe += 1;
    }
  };

  for (const finding of findings) {
    if (finding.verdict === "blocked") {
      totals.blocked += 1;
    } else if (finding.verdict === "warning") {
      totals.warning += 1;
    } else {
      totals.wins += 1;
    }

    const groups = finding.feature.groups && finding.feature.groups.length
      ? finding.feature.groups
      : [{ id: "__ungrouped__", name: "Ungrouped features" }];

    for (const group of groups) {
      const rollup = ensureGroup(group.id, group.name ?? group.id);
      addToGroup(rollup, finding.verdict);
    }
  }

  totals.groups = Array.from(groupMap.values()).sort((a, b) => {
    if (b.blocked !== a.blocked) {
      return b.blocked - a.blocked;
    }
    return b.total - a.total;
  });

  return totals;
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

// Re-export from shared utils
export { extractExtension, extensionToVariant } from "../../utils";

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

// Re-export from shared utils
export { formatBaselineDates } from "../../utils";

export function formatDiscouraged(info: DiscouragedInfo): string {
  const sources = info.accordingTo.join(", ");
  const alternatives = info.alternatives?.length
    ? `; alternatives: ${info.alternatives.map((alt) => `\`${alt}\``).join(", ")}`
    : "";
  return `According to ${sources}${alternatives}`;
}

// Re-export for compatibility
export { capitalize, escapeHtml, generateNonce };

export function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

export function renderSimpleMarkdown(text: string): string {
  const codeBlocks: string[] = [];
  let html = escapeAttribute(text);

  html = html.replace(/```([\s\S]*?)```/g, (_match, codeContent: string) => {
    const token = `__GEMINI_DETAIL_CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(codeContent);
    return token;
  });

  // Remove markdown task list checkboxes and convert to plain list items
  html = html.replace(/^(\s*)- \[[x ]\]\s*/gm, '$1- ');
  
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
      '<button type="button" class="code-copy-btn" data-action="copy-code" aria-label="Copy code snippet" title="Copy code snippet">Copy</button>',
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
