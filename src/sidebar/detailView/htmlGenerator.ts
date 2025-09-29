import * as vscode from "vscode";
import type { 
  WebviewRenderContext, 
  HtmlGenerationOptions
} from "./types";
import type { BaselineFinding } from "../workspaceScanner";
import type { Target } from "../../core/targets";
import type { GeminiSupportContext } from "../analysis/html";
import { DetailViewUtils } from "./utils";
import { DetailViewDataTransformer } from "./dataTransformer";

/**
 * Generates HTML content for detail view webviews
 */
export class DetailViewHtmlGenerator {

  /**
   * Generate complete webview HTML content
   */
  public static generateWebviewContent(
    context: WebviewRenderContext,
    detailHtml: string
  ): string {
    const nonce = DetailViewUtils.generateNonce();
    const relativePath = vscode.workspace.asRelativePath(context.finding.uri, false);

    const options: HtmlGenerationOptions = {
      nonce,
      relativePath,
      detailHtml,
      geminiContext: context.geminiContext
    };

    return this.buildHtmlDocument(options, context);
  }

  /**
   * Generate complete webview HTML content for feature view
   */
  public static generateFeatureWebviewContent(
    context: import('./types').FeatureWebviewRenderContext,
    detailHtml: string
  ): string {
    const nonce = DetailViewUtils.generateNonce();
    const featureName = context.findings[0]?.feature?.name || context.featureId;

    const options: HtmlGenerationOptions = {
      nonce,
      relativePath: `Feature: ${featureName}`,
      detailHtml,
      geminiContext: undefined // Feature view handles context differently
    };

    return this.buildFeatureHtmlDocument(options, context);
  }

  /**
   * Build the complete HTML document structure
   */
  private static buildHtmlDocument(
    options: HtmlGenerationOptions,
    context: WebviewRenderContext
  ): string {
    const { nonce, relativePath, detailHtml, geminiContext } = options;
    const { finding, target, webview } = context;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    ${this.generateHtmlHead(nonce, webview, finding)}
    ${this.generateStyles()}
</head>
<body>
    ${this.generateBodyContent(detailHtml, finding, relativePath, target, geminiContext)}
    ${this.generateJavaScript(nonce)}
</body>
</html>`;
  }

  /**
   * Build the complete HTML document structure for feature view
   */
  private static buildFeatureHtmlDocument(
    options: HtmlGenerationOptions,
    context: import('./types').FeatureWebviewRenderContext
  ): string {
    const { nonce, relativePath, detailHtml } = options;
    const { findings, target, webview } = context;
    const firstFinding = findings[0];

    return `<!DOCTYPE html>
<html lang="en">
<head>
    ${this.generateHtmlHead(nonce, webview, firstFinding)}
    ${this.generateStyles()}
    ${this.generateFeatureSpecificStyles()}
</head>
<body>
    <div class="detail-view-container">
        ${detailHtml}
    </div>
    ${this.generateJavaScript(nonce)}
</body>
</html>`;
  }

  /**
   * Generate HTML head section
   */
  private static generateHtmlHead(
    nonce: string,
    webview: vscode.Webview,
    finding: BaselineFinding
  ): string {
    return `
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Baseline Issue: ${DetailViewUtils.escapeHtml(finding.feature.name)}</title>`;
  }

  /**
   * Generate enhanced CSS styles
   */
  private static generateStyles(): string {
    return `<style>
        :root {
            color-scheme: var(--vscode-color-scheme);
        }

        *, *::before, *::after {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            line-height: 1.6;
        }

        a {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
        }

        a:hover {
            color: var(--vscode-textLink-activeForeground);
        }

        svg {
            stroke: currentColor;
        }

        .detail-view-container {
            max-width: 960px;
            margin: 0 auto;
            padding: 28px 32px 48px;
        }

        .search-container {
            position: sticky;
            top: 0;
            padding: 18px 0 12px;
            margin-bottom: 20px;
            background: var(--vscode-editor-background);
            border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
            z-index: 2;
        }

        .search-box {
            position: relative;
            max-width: 420px;
        }

        .search-input {
            width: 100%;
            padding: 10px 36px;
            border: 1px solid var(--vscode-input-border, transparent);
            border-radius: 6px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-size: 0.9rem;
            transition: border-color 0.15s ease;
        }

        .search-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .search-icon {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            width: 16px;
            height: 16px;
            opacity: 0.7;
            pointer-events: none;
        }

        .search-clear {
            position: absolute;
            right: 6px;
            top: 50%;
            transform: translateY(-50%);
            border: none;
            background: transparent;
            padding: 4px;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.6;
        }

        .search-clear:hover {
            background: var(--vscode-toolbar-hoverBackground);
            opacity: 1;
        }

        .search-clear svg {
            width: 14px;
            height: 14px;
        }

        .detail-view-header {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            align-items: flex-end;
            margin-bottom: 16px;
        }

        .detail-view-title h1 {
            margin: 0;
            font-size: 1.6rem;
            line-height: 1.2;
            font-weight: 600;
        }

        .detail-view-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .detail-view-button,
        .detail-baseline-button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border-radius: 6px;
            padding: 8px 14px;
            border: 1px solid var(--vscode-button-border, transparent);
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            font-size: 0.85rem;
            cursor: pointer;
            transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
        }

        .detail-view-button svg,
        .detail-baseline-button svg {
            width: 16px;
            height: 16px;
        }

        .button-icon {
            width: 16px;
            height: 16px;
        }

        .detail-view-button:hover,
        .detail-baseline-button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
            transform: translateY(-1px);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
        }

        .detail-baseline-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .detail-baseline-button:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .file-breadcrumb {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 0.85rem;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 24px;
        }

        .detail-content {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .detail-block {
            background: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
        }

        .detail-header-block {
            display: flex;
            gap: 12px;
            align-items: flex-start;
            margin-bottom: 16px;
        }

        .detail-icon {
            width: 28px;
            height: 28px;
            flex-shrink: 0;
        }

        .detail-title {
            font-size: 1.1rem;
            font-weight: 600;
        }

        .detail-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            font-size: 0.85rem;
            color: var(--vscode-descriptionForeground);
        }

        .detail-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 2px 10px;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .detail-badge.blocked {
            background: rgba(239, 68, 68, 0.18);
            color: #ef5350;
        }

        .detail-badge.warning {
            background: rgba(245, 158, 11, 0.18);
            color: #f5a623;
        }

        .detail-badge.safe {
            background: rgba(34, 197, 94, 0.18);
            color: #2ecc71;
        }

        .detail-section {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 16px 0;
            border-top: 1px solid var(--vscode-sideBarSectionHeader-border);
        }

        .detail-section:first-of-type {
            padding-top: 0;
            border-top: none;
        }

        .detail-section h4 {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin: 0;
            font-size: 1rem;
            font-weight: 600;
        }

        .section-icon {
            width: 18px;
            height: 18px;
        }

        .detail-section ul {
            margin: 0;
            padding-left: 18px;
        }

        .detail-context {
            display: grid;
            gap: 8px;
            font-size: 0.9rem;
        }

        .detail-code {
            padding: 12px;
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 8px;
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid var(--vscode-widget-border);
            border-radius: 8px;
            overflow: hidden;
            background: var(--vscode-editor-background);
        }

        th, td {
            padding: 10px 14px;
            text-align: left;
            border-bottom: 1px solid var(--vscode-widget-border);
            font-size: 0.9rem;
        }

        th {
            background: var(--vscode-editorWidget-background);
            font-weight: 600;
        }

        tr:last-child td {
            border-bottom: none;
        }

        tr:hover {
            background: var(--vscode-list-hoverBackground);
        }

        .resource-links {
            list-style: none;
            margin: 0;
            padding: 0;
            display: grid;
            gap: 8px;
        }

        .resource-link {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            border-radius: 8px;
            background: var(--vscode-editor-background);
            border: 1px solid transparent;
            transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }

        .resource-link .link-icon {
            width: 16px;
            height: 16px;
        }

        .resource-link:hover {
            background: var(--vscode-list-hoverBackground);
            border-color: var(--vscode-widget-border);
        }

        .detail-actions {
            display: flex;
            justify-content: flex-start;
        }

        .chat-interface {
            margin-top: 32px;
            border: 1px solid var(--vscode-widget-border);
            border-radius: 12px;
            background: var(--vscode-editorWidget-background);
            overflow: hidden;
        }

        .chat-header {
            padding: 18px 20px;
            border-bottom: 1px solid var(--vscode-widget-border);
            background: var(--vscode-editor-background);
        }

        .chat-header h3 {
            margin: 0 0 6px;
            font-size: 1.1rem;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .chat-header p {
            margin: 0;
            font-size: 0.9rem;
            color: var(--vscode-descriptionForeground);
        }

        .chat-icon {
            width: 20px;
            height: 20px;
        }

        .chat-messages {
            max-height: 420px;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .chat-message {
            display: flex;
            gap: 12px;
            align-items: flex-start;
        }

        .message-avatar {
            flex-shrink: 0;
        }

        .avatar-icon {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }

        .user-message .avatar-icon {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .ai-message .avatar-icon {
            background: linear-gradient(135deg, #4285f4, #34a853);
            color: #fff;
        }

        .message-content {
            flex: 1;
            min-width: 0;
        }

        .message-text {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 10px;
            padding: 12px 14px;
            margin-bottom: 4px;
            line-height: 1.5;
        }

        .user-message .message-text {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .message-time {
            font-size: 0.75rem;
            color: var(--vscode-descriptionForeground);
        }

        .chat-history-empty {
            text-align: center;
            padding: 36px 16px;
            color: var(--vscode-descriptionForeground);
        }

        .chat-input-container {
            padding: 18px 20px;
            border-top: 1px solid var(--vscode-widget-border);
            background: var(--vscode-editor-background);
        }

        .chat-input-wrapper {
            display: flex;
            gap: 12px;
            align-items: flex-end;
        }

        .chat-input {
            flex: 1;
            min-height: 44px;
            max-height: 140px;
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid var(--vscode-input-border, transparent);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            resize: vertical;
            font-size: 0.95rem;
        }

        .chat-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .chat-send-button {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            border: none;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background 0.15s ease, transform 0.15s ease;
        }

        .chat-send-button:hover {
            background: var(--vscode-button-hoverBackground);
            transform: translateY(-1px);
        }

        .chat-send-button:disabled {
            opacity: 0.4;
            cursor: not-allowed;
            transform: none;
        }

        .code-block {
            margin: 12px 0;
            border: 1px solid var(--vscode-widget-border);
            border-radius: 8px;
            overflow: hidden;
            background: var(--vscode-textCodeBlock-background);
        }

        .code-header {
            display: flex;
            justify-content: flex-end;
            padding: 8px 10px;
            border-bottom: 1px solid var(--vscode-widget-border);
            background: var(--vscode-editorWidget-background);
        }

        .copy-code-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            border: none;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 0.75rem;
            cursor: pointer;
            transition: background 0.15s ease;
        }

        .copy-code-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .code-block pre {
            margin: 0;
            padding: 12px 16px;
            overflow-x: auto;
        }

        .code-block code,
        .inline-code {
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
        }

        .inline-code {
            padding: 2px 4px;
            border-radius: 4px;
            background: var(--vscode-textCodeBlock-background);
        }

        .search-highlight {
            background: var(--vscode-editor-findMatchHighlightBackground);
            color: var(--vscode-editor-findMatchHighlightForeground);
            border-radius: 3px;
        }

        .loading-spinner {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2px solid var(--vscode-descriptionForeground);
            border-top-color: var(--vscode-progressBar-background);
            animation: spin 0.8s linear infinite;
            display: inline-block;
        }

        .error-message {
            padding: 12px 14px;
            border-radius: 8px;
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-errorForeground);
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        @media (max-width: 720px) {
            .detail-view-container {
                padding: 20px 18px 32px;
            }

            .detail-view-header {
                flex-direction: column;
                align-items: flex-start;
            }

            .detail-view-actions {
                width: 100%;
                justify-content: flex-start;
            }

            .chat-input-wrapper {
                flex-direction: column;
                align-items: stretch;
            }

            .chat-send-button {
                width: 100%;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
                scroll-behavior: auto !important;
            }
        }
    </style>`;
  }

  /**
   * Generate feature-specific styles for feature view
   */
  private static generateFeatureSpecificStyles(): string {
    return `<style>
        .feature-occurrences {
            margin-top: 24px;
        }

        .feature-occurrence-item {
            background: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-sideBarSectionHeader-border);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
            transition: all 0.2s ease;
        }

        .feature-occurrence-item:hover {
            background: var(--vscode-list-hoverBackground);
            border-color: var(--vscode-focusBorder);
        }

        .occurrence-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
        }

        .occurrence-file-info {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
        }

        .occurrence-file-path {
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
            cursor: pointer;
        }

        .occurrence-file-path:hover {
            text-decoration: underline;
        }

        .occurrence-line-info {
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
        }

        .occurrence-verdict {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .occurrence-code {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 8px 12px;
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
            color: var(--vscode-editor-foreground);
            white-space: pre-wrap;
            overflow-x: auto;
        }

        .feature-summary {
            background: var(--vscode-inputOption-hoverBackground);
            border-left: 4px solid var(--vscode-focusBorder);
            padding: 16px;
            margin-bottom: 24px;
            border-radius: 0 4px 4px 0;
        }

        .feature-summary h2 {
            margin: 0 0 8px 0;
            color: var(--vscode-foreground);
        }

        .feature-count {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
        }

        /* Occurrences section styles for enhanced single view */
        .occurrences-list {
            margin-top: 12px;
        }

        .occurrence-item {
            background: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-sideBarSectionHeader-border);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
            transition: all 0.2s ease;
        }

        .occurrence-item:hover {
            background: var(--vscode-list-hoverBackground);
            border-color: var(--vscode-focusBorder);
        }

        .occurrence-item.current-occurrence {
            border-color: var(--vscode-focusBorder);
            background: var(--vscode-inputOption-hoverBackground);
        }

        .occurrence-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .occurrence-file-info {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
        }

        .occurrence-file-path {
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
            cursor: pointer;
        }

        .occurrence-file-path:hover {
            text-decoration: underline;
        }

        .occurrence-line-info {
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
        }

        .current-indicator {
            background: var(--vscode-focusBorder);
            color: var(--vscode-button-foreground);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: 600;
        }

        .occurrence-verdict {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .occurrence-code {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 6px 10px;
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
            color: var(--vscode-editor-foreground);
            white-space: pre-wrap;
            overflow-x: auto;
        }
    </style>`;
  }

  /**
   * Generate body content
   */
  private static generateBodyContent(
    detailHtml: string,
    finding: BaselineFinding,
    relativePath: string,
    target: Target,
    geminiContext?: GeminiSupportContext
  ): string {
    const findingId = DetailViewDataTransformer.generateFindingId(finding);
    const featureId = finding.feature.id || findingId;
    const containerAttributes = [
      `data-finding-id="${DetailViewUtils.sanitizeAttribute(findingId)}"`,
      `data-feature-id="${DetailViewUtils.sanitizeAttribute(featureId)}"`,
      `data-feature-name="${DetailViewUtils.sanitizeAttribute(finding.feature.name)}"`,
      `data-file-path="${DetailViewUtils.sanitizeAttribute(relativePath)}"`,
      `data-file-uri="${DetailViewUtils.sanitizeAttribute(finding.uri.toString())}"`,
      `data-target="${DetailViewUtils.sanitizeAttribute(target)}"`
    ].join(' ');

    return `
    <div class="detail-view-container" ${containerAttributes}>
        <!-- Search functionality -->
        <div class="search-container">
            <div class="search-box">
                <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input 
                    type="text" 
                    class="search-input" 
                    id="searchInput"
                    placeholder="Search in page content..."
                >
                <button class="search-clear" id="searchClear" onclick="clearSearch()" style="display: none;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        </div>

        <div class="detail-view-header">
            <div class="detail-view-title">
                <h1>${DetailViewUtils.escapeHtml(finding.feature.name)}</h1>
            </div>
            <div class="detail-view-actions">
                <button class="detail-view-button" onclick="refreshView()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                        <path d="M21 3v5h-5"></path>
                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                        <path d="M3 21v-5h5"></path>
                    </svg>
                    Refresh
                </button>
            </div>
        </div>
        
        <div class="file-breadcrumb">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"></path>
            </svg>
            ${DetailViewUtils.escapeHtml(relativePath)}
        </div>
        
        <div class="detail-content" id="detailContent">
            ${detailHtml}
        </div>
        
        ${geminiContext ? this.generateChatInterface(geminiContext) : ''}
    </div>`;
  }

  /**
   * Generate chat interface HTML with improvements
   */
  private static generateChatInterface(geminiContext: GeminiSupportContext): string {
    const existingMessages = geminiContext.suggestions ? 
      DetailViewUtils.renderExistingChatMessages(geminiContext.suggestions) : '';
    
    return `
    <div class="chat-interface">
        <div class="chat-header">
            <h3>
              <svg class="chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              AI Assistant
            </h3>
            <p>Ask questions about this issue or request help with implementation.</p>
        </div>
        
        <div class="chat-messages" id="chatMessages">
            ${existingMessages}
            <div id="responseArea"></div>
        </div>
        
        <div class="chat-input-container">
            <div class="chat-input-wrapper">
                <textarea 
                    class="chat-input" 
                    id="chatInput" 
                    placeholder="Ask a follow-up question about this issue..."
                    rows="2"
                ></textarea>
                <button class="chat-send-button" id="sendButton" onclick="sendFollowUpQuestion()" title="Send message">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22,2 15,22 11,13 2,9"></polygon>
                    </svg>
                </button>
            </div>
        </div>
    </div>`;
  }

  /**
   * Generate enhanced JavaScript for interactivity
   */
  private static generateJavaScript(nonce: string): string {
    return `
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        const detailMetadata = readDetailMetadata();

        // Initialize page functionality
        document.addEventListener('DOMContentLoaded', function() {
            initializeSearch();
            initializeChat();
            initializeButtonHandlers();
        });

        function readDetailMetadata() {
            const container = document.querySelector('.detail-view-container');
            if (!container) {
                return {
                    findingId: '',
                    featureId: '',
                    featureName: '',
                    filePath: '',
                    target: ''
                };
            }

            return {
                findingId: container.getAttribute('data-finding-id') || '',
                featureId: container.getAttribute('data-feature-id') || '',
                featureName: container.getAttribute('data-feature-name') || '',
                filePath: container.getAttribute('data-file-path') || '',
                target: container.getAttribute('data-target') || ''
            };
        }

        // Search functionality
        function initializeSearch() {
            const searchInput = document.getElementById('searchInput');
            const searchClear = document.getElementById('searchClear');
            
            if (searchInput) {
                searchInput.addEventListener('input', function(e) {
                    const query = e.target.value.trim();
                    if (query) {
                        searchClear.style.display = 'block';
                        performSearch(query);
                    } else {
                        searchClear.style.display = 'none';
                        clearSearchHighlights();
                    }
                });
                
                searchInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape') {
                        clearSearch();
                    }
                });
            }
        }
        
        function performSearch(query) {
            clearSearchHighlights();
            if (!query) return;
            
            const content = document.getElementById('detailContent');
            const walker = document.createTreeWalker(
                content,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            const textNodes = [];
            let node;
            while (node = walker.nextNode()) {
                textNodes.push(node);
            }
            
            const escapedQuery = escapeRegExp(query);
            const regex = new RegExp('(' + escapedQuery + ')', 'gi');
            
            textNodes.forEach(textNode => {
                const text = textNode.textContent;
                if (regex.test(text)) {
                    const highlightedText = text.replace(regex, '<mark class="search-highlight">$1</mark>');
                    const wrapper = document.createElement('span');
                    wrapper.innerHTML = highlightedText;
                    textNode.parentNode.replaceChild(wrapper, textNode);
                }
            });
            
            // Scroll to first match
            const firstMatch = content.querySelector('.search-highlight');
            if (firstMatch) {
                firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        
        function clearSearch() {
            const searchInput = document.getElementById('searchInput');
            const searchClear = document.getElementById('searchClear');
            searchInput.value = '';
            searchClear.style.display = 'none';
            clearSearchHighlights();
        }
        
        function clearSearchHighlights() {
            const highlights = document.querySelectorAll('.search-highlight');
            highlights.forEach(highlight => {
                const parent = highlight.parentNode;
                parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
                parent.normalize();
            });
        }
        
        function escapeRegExp(string) {
            return string.replace(/[\\\\^$*+?.()|[\\]{}]/g, '\\\\$&');
        }
        
        // Chat functionality
        function initializeChat() {
            const chatInput = document.getElementById('chatInput');
            if (chatInput) {
                chatInput.addEventListener('keydown', function(event) {
                    if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        sendFollowUpQuestion();
                    }
                });
                
                // Auto-resize textarea
                chatInput.addEventListener('input', function() {
                    this.style.height = 'auto';
                    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
                });
            }
        }
        
        // Button handlers
        function initializeButtonHandlers() {
            document.addEventListener('click', function(event) {
                const target = event.target instanceof Element ? event.target : null;
                if (!target) {
                    return;
                }

                const commandTarget = target.closest('[data-command]');
                if (commandTarget instanceof HTMLElement) {
                    event.preventDefault();
                    const command = commandTarget.getAttribute('data-command');
                    if (command) {
                        vscode.postMessage({
                            type: 'executeCommand',
                            command
                        });
                    }
                }

                // Handle occurrence file path clicks
                const occurrenceTarget = target.closest('.occurrence-file-path');
                if (occurrenceTarget instanceof HTMLElement) {
                    event.preventDefault();
                    const uri = occurrenceTarget.getAttribute('data-uri');
                    const line = occurrenceTarget.getAttribute('data-line');
                    const character = occurrenceTarget.getAttribute('data-character');
                    
                    if (uri && line && character) {
                        vscode.postMessage({
                            type: 'openFileAtLine',
                            uri: uri,
                            line: parseInt(line, 10),
                            character: parseInt(character, 10)
                        });
                    }
                }
            });
        }
        
        // Copy code to clipboard
        function copyCodeToClipboard(button) {
            const code = button.getAttribute('data-code');
            vscode.postMessage({
                type: 'copyCodeSnippet',
                code: code
            });
        }
        
        // Refresh view
        function refreshView() {
            vscode.postMessage({
                type: 'refresh'
            });
        }

        
        // Send follow-up question with enhanced functionality
        function sendFollowUpQuestion() {
            const input = document.getElementById('chatInput');
            const button = document.getElementById('sendButton');
            const question = input.value.trim();
            
            if (!question) return;
            
            // Disable input and button
            input.disabled = true;
            button.disabled = true;
            
            // Add user message to chat (separate entry as requested)
            addUserMessage(question);
            
            // Send message to extension
            vscode.postMessage({
                type: 'askGeminiFollowUp',
                question: question,
                findingId: detailMetadata.findingId || 'current',
                feature: detailMetadata.featureId || detailMetadata.featureName || '', // Use featureId for shared conversations
                filePath: detailMetadata.filePath || '',
                target: detailMetadata.target || ''
            });
            
            // Clear input
            input.value = '';
            input.style.height = 'auto';
        }
        
        // Add user message with SVG avatar
        function addUserMessage(message) {
            const messagesContainer = document.getElementById('chatMessages');
            
            // Remove empty state if it exists
            const emptyState = messagesContainer.querySelector('.chat-history-empty');
            if (emptyState) {
                emptyState.remove();
            }
            
            // Add separator if there are existing messages but no header yet
            if (!messagesContainer.querySelector('.chat-history-header') && messagesContainer.children.length > 0) {
                const separatorHtml = \`
                    <div class="new-conversation-separator">
                        <hr style="border: none; border-top: 1px solid var(--vscode-widget-border); margin: 20px 0;">
                        <small style="color: var(--vscode-descriptionForeground); text-align: center; display: block; margin-top: -10px; background: var(--vscode-editor-background); padding: 0 8px;">New Conversation</small>
                    </div>
                \`;
                messagesContainer.insertAdjacentHTML('beforeend', separatorHtml);
            }
            
            const messageHtml = \`
                <div class="chat-message user-message">
                    <div class="message-avatar">
                        <div class="avatar-icon user-avatar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        </div>
                    </div>
                    <div class="message-content">
                        <div class="message-text">\${message}</div>
                        <div class="message-time">\${new Date().toLocaleString()}</div>
                    </div>
                </div>
            \`;
            messagesContainer.insertAdjacentHTML('beforeend', messageHtml);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Show loading indicator
            showLoadingIndicator();
        }
        
        // Show enhanced loading indicator
        function showLoadingIndicator() {
            const messagesContainer = document.getElementById('chatMessages');
            const loadingHtml = \`
                <div class="chat-message ai-message loading-message">
                    <div class="message-avatar">
                        <div class="avatar-icon ai-avatar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M9.663 17h4.673M12 3l1.735 3.013 3.408.494-2.463 2.401.582 3.392L12 10.695 8.738 12.3l.582-3.392-2.463-2.401 3.408-.494L12 3z"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="message-content">
                        <div class="message-text">
                            <div class="loading-spinner"></div>
                            <span style="margin-left: 8px;">Thinking...</span>
                        </div>
                    </div>
                </div>
            \`;
            messagesContainer.insertAdjacentHTML('beforeend', loadingHtml);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'geminiResponse':
                    handleGeminiResponse(message);
                    break;
                case 'scrollToAIAssistant':
                    scrollToAIAssistant();
                    break;
            }
        });
        
        // Handle Gemini response with proper markdown formatting
        function handleGeminiResponse(response) {
            const input = document.getElementById('chatInput');
            const button = document.getElementById('sendButton');
            const messagesContainer = document.getElementById('chatMessages');
            
            // Remove loading message
            const loadingMessage = messagesContainer.querySelector('.loading-message');
            if (loadingMessage) {
                loadingMessage.remove();
            }
            
            // Re-enable input and button
            input.disabled = false;
            button.disabled = false;
            
            let responseHtml = '';
            
            if (response.state === 'success') {
                // Format response as proper markdown
                const formattedResponse = formatMarkdown(response.response || response.suggestion || '');
                responseHtml = \`
                    <div class="chat-message ai-message">
                        <div class="message-avatar">
                            <div class="avatar-icon ai-avatar">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M9.663 17h4.673M12 3l1.735 3.013 3.408.494-2.463 2.401.582 3.392L12 10.695 8.738 12.3l.582-3.392-2.463-2.401 3.408-.494L12 3z"></path>
                                </svg>
                            </div>
                        </div>
                        <div class="message-content">
                            <div class="message-text">\${formattedResponse}</div>
                            <div class="message-time">\${new Date().toLocaleString()}</div>
                        </div>
                    </div>
                \`;
            } else if (response.state === 'error') {
                responseHtml = \`
                    <div class="chat-message ai-message">
                        <div class="message-avatar">
                            <div class="avatar-icon ai-avatar" style="background: #ef4444;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="15" y1="9" x2="9" y2="15"></line>
                                    <line x1="9" y1="9" x2="15" y2="15"></line>
                                </svg>
                            </div>
                        </div>
                        <div class="message-content">
                            <div class="error-message">
                                Error: \${response.error}
                            </div>
                            <div class="message-time">\${new Date().toLocaleString()}</div>
                        </div>
                    </div>
                \`;
            }
            
            // Add the response to the messages container
            if (responseHtml) {
                messagesContainer.insertAdjacentHTML('beforeend', responseHtml);
            }
            
            // Scroll to bottom (latest message appears at the end as requested)
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        // Format markdown for proper display - enhanced with better formatting
        function formatMarkdown(text) {  
            return text
                .replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<div class="code-block" data-code-block><pre><code>$1</code></pre><button type="button" class="code-copy-btn" data-action="copy-code" aria-label="Copy code snippet" title="Copy code snippet">Copy</button></div>')
                .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
                .replace(/\\*\\*\\*([^*]+)\\*\\*\\*/g, '<strong><em>$1</em></strong>')
                .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
                .replace(/\\*([^*]+)\\*/g, '<em>$1</em>')
                .replace(/^### (.*$)/gm, '<h3>$1</h3>')
                .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                .replace(/^\\* (.+)$/gm, '<li>$1</li>')
                .replace(/^\\d+\\. (.+)$/gm, '<li>$1</li>')
                .replace(/(<li>.*<\\/li>)/s, '<ul>$1</ul>')
                .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
                .replace(/\\n\\n/g, '</p><p>')
                .replace(/\\n/g, '<br>');
        }
        
        // Scroll to AI Assistant section
        function scrollToAIAssistant() {
            const aiAssistantSection = document.querySelector('.chat-interface');
            if (aiAssistantSection) {
                aiAssistantSection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
                
                // Optional: Add a brief highlight effect
                aiAssistantSection.style.backgroundColor = 'var(--vscode-editor-findMatchBackground)';
                setTimeout(() => {
                    aiAssistantSection.style.backgroundColor = '';
                }, 2000);
            }
        }
        
        // CSS for search highlights
        const style = document.createElement('style');
        style.textContent = \`
            .search-highlight {
                background: var(--vscode-editor-findMatchHighlightBackground);
                color: var(--vscode-editor-findMatchHighlightForeground);
                border-radius: 2px;
                padding: 1px 2px;
            }
        \`;
        document.head.appendChild(style);
    </script>`;
  }
}
