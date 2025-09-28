import * as vscode from "vscode";
import type { 
  WebviewRenderContext, 
  HtmlGenerationOptions,
  SeverityIconUris 
} from "./types";
import type { BaselineFinding } from "../workspaceScanner";
import type { Target } from "../../core/targets";
import type { GeminiSupportContext } from "../analysis/html";
import { DetailViewUtils } from "./utils";

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
   * Build the complete HTML document structure
   */
  private static buildHtmlDocument(
    options: HtmlGenerationOptions,
    context: WebviewRenderContext
  ): string {
    const { nonce, relativePath, detailHtml, geminiContext } = options;
    const { finding, webview } = context;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    ${this.generateHtmlHead(nonce, webview, finding)}
    ${this.generateStyles()}
</head>
<body>
    ${this.generateBodyContent(detailHtml, finding, relativePath, geminiContext)}
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
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 0;
            line-height: 1.6;
        }

        /* Global SVG styling */
        svg {
            color: var(--vscode-foreground);
            stroke: currentColor;
        }

        .detail-view-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 24px;
        }

        /* Search functionality */
        .search-container {
            position: sticky;
            top: 0;
            background: var(--vscode-editor-background);
            z-index: 100;
            padding: 16px 0;
            border-bottom: 1px solid var(--vscode-widget-border);
            margin-bottom: 24px;
        }

        .search-box {
            position: relative;
            max-width: 400px;
        }

        .search-input {
            width: 100%;
            padding: 12px 16px 12px 40px;
            border: 2px solid var(--vscode-input-border);
            border-radius: 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-size: 14px;
            box-sizing: border-box;
            transition: border-color 0.2s;
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
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            opacity: 0.7;
        }

        .search-clear:hover {
            background: var(--vscode-toolbar-hoverBackground);
            opacity: 1;
        }

        .search-clear svg {
            width: 16px;
            height: 16px;
        }

        .detail-view-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--vscode-widget-border);
        }

        .detail-view-title {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .detail-view-title h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }

        .detail-view-actions {
            display: flex;
            gap: 8px;
        }

        .detail-view-button {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 6px;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
        }

        .detail-view-button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
            transform: translateY(-1px);
        }

        .detail-view-button.primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .detail-view-button.primary:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .file-breadcrumb {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
        }

        /* Enhanced section styling */
        .detail-section h4 {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0 0 12px 0;
            font-size: 16px;
            font-weight: 600;
        }

        .section-icon {
            width: 16px;
            height: 16px;
            color: var(--vscode-textLink-foreground);
        }

        /* SVG icon improvements */
        .detail-icon {
            width: 24px;
            height: 24px;
            flex-shrink: 0;
        }

        .detail-icon.blocked {
            color: #ef4444;
        }

        .detail-icon.warning {
            color: #f59e0b;
        }

        .detail-icon.safe {
            color: #22c55e;
        }

        /* Enhanced buttons */
        .detail-baseline-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            padding: 12px 16px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
        }

        .detail-baseline-button:hover {
            background: var(--vscode-button-hoverBackground);
            transform: translateY(-1px);
        }

        .button-icon {
            width: 16px;
            height: 16px;
        }

        /* Enhanced resource links */
        .resource-links {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .resource-links li {
            margin-bottom: 8px;
        }

        .resource-link {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
            padding: 8px 12px;
            border-radius: 6px;
            transition: all 0.2s ease;
        }

        .resource-link:hover {
            background: var(--vscode-list-hoverBackground);
            color: var(--vscode-textLink-activeForeground);
        }

        .link-icon {
            width: 14px;
            height: 14px;
            flex-shrink: 0;
        }

        /* Enhanced tables */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 8px;
            overflow: hidden;
        }

        th, td {
            padding: 12px 16px;
            text-align: left;
            border-bottom: 1px solid var(--vscode-widget-border);
        }

        th {
            background: var(--vscode-editorWidget-background);
            font-weight: 600;
            font-size: 13px;
            color: var(--vscode-foreground);
            border-bottom: 2px solid var(--vscode-widget-border);
        }

        td {
            font-size: 13px;
        }

        tr:last-child td {
            border-bottom: none;
        }

        tr:hover {
            background: var(--vscode-list-hoverBackground);
        }

        /* Enhanced Chat Interface Styles */
        .chat-interface {
            background: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 12px;
            margin-top: 24px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .chat-header {
            padding: 20px;
            border-bottom: 1px solid var(--vscode-widget-border);
            background: var(--vscode-editor-background);
            border-radius: 12px 12px 0 0;
        }

        .chat-header h3 {
            margin: 0 0 8px 0;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 18px;
            font-weight: 600;
        }

        .chat-icon {
            width: 20px;
            height: 20px;
            color: var(--vscode-textLink-foreground);
        }

        .chat-header p {
            margin: 0;
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }

        .chat-messages {
            max-height: 500px;
            overflow-y: auto;
            padding: 20px;
            scroll-behavior: smooth;
        }

        .chat-message {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
            align-items: flex-start;
        }

        .message-avatar {
            flex-shrink: 0;
            width: 36px;
            height: 36px;
        }

        .avatar-icon {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: var(--vscode-badge-background);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
        }

        .user-message .avatar-icon {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .ai-message .avatar-icon {
            background: linear-gradient(135deg, #4285f4, #34a853);
            color: white;
        }

        .message-content {
            flex: 1;
            min-width: 0;
        }

        .message-text {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 12px;
            padding: 12px 16px;
            margin-bottom: 4px;
            line-height: 1.5;
        }

        .user-message .message-text {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .ai-message .message-text {
            background: var(--vscode-editorWidget-background);
        }

        .message-time {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            opacity: 0.8;
        }

        /* Chat history styles */
        .chat-history-empty {
            padding: 40px 20px;
            text-align: center;
        }

        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
        }

        .empty-state p {
            margin: 0;
            color: var(--vscode-descriptionForeground);
            font-size: 16px;
            font-weight: 500;
        }

        .empty-state small {
            color: var(--vscode-descriptionForeground);
            opacity: 0.7;
            font-size: 14px;
        }

        .chat-history-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 0 16px 0;
            margin-bottom: 16px;
            border-bottom: 1px solid var(--vscode-widget-border);
        }

        .chat-history-header h4 {
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .chat-history-header small {
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 8px;
            border-radius: 12px;
        }

        /* Enhanced input container */
        .chat-input-container {
            padding: 20px;
            border-top: 1px solid var(--vscode-widget-border);
            background: var(--vscode-editor-background);
            border-radius: 0 0 12px 12px;
        }

        .chat-input-wrapper {
            position: relative;
            display: flex;
            align-items: flex-end;
            gap: 12px;
        }

        .chat-input {
            flex: 1;
            min-height: 44px;
            max-height: 120px;
            padding: 12px 16px;
            border: 2px solid var(--vscode-input-border);
            border-radius: 12px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-size: 14px;
            font-family: var(--vscode-font-family);
            resize: none;
            transition: border-color 0.2s;
        }

        .chat-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .chat-send-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 12px;
            width: 44px;
            height: 44px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            flex-shrink: 0;
        }

        .chat-send-button:hover {
            background: var(--vscode-button-hoverBackground);
            transform: translateY(-1px);
        }

        .chat-send-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .chat-send-button svg {
            width: 20px;
            height: 20px;
        }

        /* Loading and error states */
        .loading-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid var(--vscode-widget-border);
            border-top: 2px solid var(--vscode-textLink-foreground);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .error-message {
            background: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 8px;
            padding: 12px;
            margin: 8px 0;
        }

        /* Markdown formatting in messages */
        .message-text h1, .message-text h2, .message-text h3, 
        .message-text h4, .message-text h5, .message-text h6 {
            margin: 12px 0 8px 0;
            font-weight: 600;
        }

        .message-text p {
            margin: 8px 0;
        }

        .message-text ul, .message-text ol {
            margin: 8px 0;
            padding-left: 20px;
        }

        .message-text li {
            margin: 4px 0;
        }

        .message-text code {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 4px;
            padding: 2px 6px;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
        }

        .message-text pre {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 8px;
            padding: 12px;
            overflow-x: auto;
            margin: 12px 0;
            font-family: var(--vscode-editor-font-family);
            font-size: 13px;
        }

        .message-text blockquote {
            border-left: 4px solid var(--vscode-textLink-foreground);
            padding-left: 12px;
            margin: 12px 0;
            font-style: italic;
            opacity: 0.9;
        }
            font-size: 16px;
        }

        .user-message .avatar-icon {
            background: var(--vscode-button-background);
        }

        .ai-message .avatar-icon {
            background: var(--vscode-textLink-foreground);
        }

        .message-content {
            flex: 1;
            background: var(--vscode-input-background);
            border-radius: 8px;
            padding: 12px;
            border: 1px solid var(--vscode-input-border);
        }

        .message-text {
            margin-bottom: 8px;
        }

        .message-time {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }

        .chat-input-area {
            padding: 16px;
            border-top: 1px solid var(--vscode-widget-border);
            background: var(--vscode-editor-background);
            border-radius: 0 0 8px 8px;
        }

        .chat-input {
            width: 100%;
            padding: 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
            font-size: inherit;
            resize: vertical;
            min-height: 40px;
        }

        .chat-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .chat-send-button {
            margin-top: 8px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            cursor: pointer;
        }

        .chat-send-button:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .chat-send-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* Code block styles */
        .code-block {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 4px;
            margin: 8px 0;
            overflow: hidden;
        }

        .code-header {
            background: var(--vscode-editorWidget-background);
            padding: 8px 12px;
            border-bottom: 1px solid var(--vscode-widget-border);
            display: flex;
            justify-content: flex-end;
        }

        .copy-code-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
            font-size: 12px;
        }

        .copy-code-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .code-block pre {
            margin: 0;
            padding: 12px;
            overflow-x: auto;
        }

        .code-block code {
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
        }

        .inline-code {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
        }

        /* Loading and status styles */
        .loading-spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid var(--vscode-descriptionForeground);
            border-radius: 50%;
            border-top-color: var(--vscode-progressBar-background);
            animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .error-message {
            color: var(--vscode-errorForeground);
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 4px;
            padding: 8px 12px;
            margin: 8px 0;
        }

        .success-message {
            color: var(--vscode-foreground);
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            padding: 8px 12px;
            margin: 8px 0;
        }

        /* Responsive styles */
        @media (max-width: 768px) {
            .detail-view-container {
                padding: 16px;
            }
            
            .detail-view-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 12px;
            }
            
            .detail-view-actions {
                align-self: stretch;
            }
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
    geminiContext?: GeminiSupportContext
  ): string {
    return `
    <div class="detail-view-container">
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
        
        // Initialize page functionality
        document.addEventListener('DOMContentLoaded', function() {
            initializeSearch();
            initializeChat();
            initializeButtonHandlers();
        });
        
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
            // Resource links
            document.addEventListener('click', function(e) {
                if (e.target.matches('[data-command]')) {
                    e.preventDefault();
                    const command = e.target.getAttribute('data-command');
                    vscode.postMessage({
                        type: 'executeCommand',
                        command: command
                    });
                }
                
                // Baseline details button
                if (e.target.matches('.detail-baseline-button')) {
                    const featureName = e.target.getAttribute('data-feature-name');
                    vscode.postMessage({
                        type: 'openBaselineDetails',
                        feature: featureName
                    });
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
                findingId: 'current',
                feature: '',
                filePath: '',
                target: ''
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
        
        // Format markdown for proper display
        function formatMarkdown(text) {  
            return text
                .replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>')
                .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
                .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
                .replace(/\\*([^*]+)\\*/g, '<em>$1</em>')
                .replace(/^### (.*$)/gm, '<h3>$1</h3>')
                .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                .replace(/\\n\\n/g, '</p><p>')
                .replace(/\\n/g, '<br>');
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