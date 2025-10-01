import * as vscode from "vscode";

import type { Verdict } from "../../../core/scoring";
import type { Target } from "../../../core/targets";
import type { BaselineFinding } from "../../workspaceScanner";
import type { BaselineAnalysisAssets, GeminiSupportContext } from "../types";
import {
  capitalize,
  escapeAttribute,
  escapeHtml,
  formatBaselineSummary,
  formatDiscouraged,
  formatVerdict,
  getBaselineIconHtml,
  renderSupportTables
} from "../utils";
import { buildResourceLinks } from "../../../hover/render/contentBuilder";

export function buildIssueDetailHtml(options: {
  finding: BaselineFinding;
  severityIconUris: Record<Verdict, string>;
  target: Target;
  assets: BaselineAnalysisAssets;
  webview: vscode.Webview;
  gemini?: GeminiSupportContext;
}): string {
  const { finding, severityIconUris, target, assets, webview, gemini } = options;
  const feature = finding.feature;
  const relativePath = vscode.workspace.asRelativePath(finding.uri, false);
  const verdictLabel = formatVerdict(finding.verdict);
  const baselineSummary = formatBaselineSummary(feature);
  const baselineIcon = getBaselineIconHtml(feature, assets, webview);
  const supportTable = renderSupportTables(feature, target);
  const groups = feature.groups.map((group) => escapeHtml(group.name)).join(", ");
  const snapshots = feature.snapshots.map((snapshot) => escapeHtml(snapshot.name)).join(", ");
  const discouraged = feature.discouraged
    ? `<div class="detail-section detail-discouraged"><h4>Usage guidance</h4><p><strong>Discouraged:</strong> ${escapeHtml(
        formatDiscouraged(feature.discouraged)
      )}</p></div>`
    : "";

  const description = feature.description
    ? `<div class="detail-section"><h4>Description</h4><p>${escapeHtml(feature.description)}</p></div>`
    : "";

  const contextLines: string[] = [];
  if (groups) {
    contextLines.push(`<div><strong>Groups:</strong> ${groups}</div>`);
  }
  if (snapshots) {
    contextLines.push(`<div><strong>Snapshots:</strong> ${snapshots}</div>`);
  }

  const contextBlock = contextLines.length
    ? `<div class="detail-section"><h4>Context</h4><div class="detail-context">${contextLines.join("")}</div></div>`
    : "";

  const verdictBadge = `<span class="detail-badge ${finding.verdict}">${escapeHtml(verdictLabel)}</span>`;
  
  const getSeverityIconSvg = (verdict: Verdict) => {
    switch (verdict) {
      case 'blocked':
        return `<svg class="detail-icon blocked" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>`;
      case 'warning':
        return `<svg class="detail-icon warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>`;
      case 'safe':
        return `<svg class="detail-icon safe" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22,4 12,14.01 9,11.01"></polyline>
        </svg>`;
      default:
        return '';
    }
  };

  const severityIcon = getSeverityIconSvg(finding.verdict);

  const location = `${escapeHtml(relativePath)} · line ${finding.range.start.line + 1}, column ${
    finding.range.start.character + 1
  }`;

  const resourceLinks = buildResourceLinks(feature);
  const resourceSection = resourceLinks.length > 0
    ? `<div class="detail-section">
        <h4>
          <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          Resources
        </h4>
        <ul class="resource-links">
          ${resourceLinks.map(link => {
            const markdownLinkMatch = link.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (markdownLinkMatch) {
              const [, text, url] = markdownLinkMatch;
              const cleanText = text.replace(/\\([\[\]()])/g, '$1').replace(/\\+/g, '');

              if (url.startsWith('command:')) {
                return `<li>
                  <a href="#" data-command="${escapeAttribute(url)}" class="resource-link command-link">
                    <svg class="link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15,3 21,3 21,9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    ${escapeHtml(cleanText)}
                  </a>
                </li>`;
              } else {
                return `<li>
                  <a href="${escapeAttribute(url)}" target="_blank" class="resource-link external-link">
                    <svg class="link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15,3 21,3 21,9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    ${escapeHtml(cleanText)}
                  </a>
                </li>`;
              }
            }
            return `<li>${escapeHtml(link)}</li>`;
          }).join('')}
        </ul>
      </div>`
    : "";

  const openDocsCommand = feature.id
    ? `command:baseline-gate.openDocs?${encodeURIComponent(JSON.stringify({ id: feature.id }))}`
    : '';

  const baselineDetailsButton = openDocsCommand
    ? `
    <button class="detail-baseline-button" type="button" data-command="${escapeAttribute(openDocsCommand)}">
      <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14,2 14,8 20,8"></polyline>
      </svg>
      Open Baseline Details
    </button>`
    : '';

  const actionButtons = baselineDetailsButton
    ? `<div class="detail-section detail-actions">${baselineDetailsButton}</div>`
    : '';

  return `
      <div class="detail-block">
        <header class="detail-header-block">
          ${severityIcon}
          <div>
            <div class="detail-title">${escapeHtml(feature.name)}</div>
            <div class="detail-meta">${verdictBadge} ${escapeHtml(location)}</div>
          </div>
        </header>
        <div class="detail-section">
          <h4>
            <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 11H1v-1a4 4 0 1 1 8 0v1z"></path>
              <circle cx="13" cy="17" r="4"></circle>
              <path d="m21 21-1.5-1.5"></path>
            </svg>
            Summary
          </h4>
          <ul>
            <li>${escapeHtml(verdictLabel)} for ${escapeHtml(capitalize(target))} targets</li>
            <li>${baselineIcon} ${escapeHtml(baselineSummary)}</li>
          </ul>
        </div>
        ${description}
        ${discouraged}
        ${supportTable}
        ${contextBlock}
        ${resourceSection}
        ${actionButtons}
      </div>
    `;
}

export function buildFileDetailHtml(
  findings: BaselineFinding[],
  severityIconUris: Record<Verdict, string>,
  options: {
    target: Target;
    assets: BaselineAnalysisAssets;
    webview: vscode.Webview;
    getGeminiContext: (finding: BaselineFinding) => GeminiSupportContext | undefined;
  }
): string {
  const sections = findings
    .sort((a, b) => a.range.start.line - b.range.start.line)
    .map((finding, index) => {
      const anchor = `issue-${index + 1}`;
      const header =
        `<div class="detail-subtitle">Finding ${index + 1} — ${escapeHtml(formatVerdict(finding.verdict))} (line ${
          finding.range.start.line + 1
        })</div>`;
      const html = buildIssueDetailHtml({
        finding,
        severityIconUris,
        target: options.target,
        assets: options.assets,
        webview: options.webview,
        gemini: options.getGeminiContext(finding)
      });
      return `<section id="${anchor}" class="detail-entry">${header}${html}</section>`;
    });

  return sections.join("\n");
}
