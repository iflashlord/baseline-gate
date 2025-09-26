import * as vscode from "vscode";
import type { BaselineFinding } from "./workspaceScanner";
import type { Target } from "../core/targets";
import type { BaselineAnalysisAssets } from "./analysis/types";
import type { GeminiSupportContext } from "./analysis/html";
import { buildIssueDetailHtml, buildFileDetailHtml } from "./analysis/html";
import type { GeminiSuggestion } from "../gemini/geminiService";
import { scoreFeature, type Verdict } from "../core/scoring";

export class BaselineDetailViewProvider {
  private static currentPanel: vscode.WebviewPanel | undefined;
  private static currentFinding: BaselineFinding | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly assets: BaselineAnalysisAssets,
    private readonly geminiProvider?: import('../gemini/geminiViewProvider').GeminiViewProvider
  ) {}

  public static createOrShow(
    context: vscode.ExtensionContext,
    finding: BaselineFinding,
    target: Target,
    assets: BaselineAnalysisAssets,
    geminiProvider?: import('../gemini/geminiViewProvider').GeminiViewProvider
  ): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it and update content
    if (BaselineDetailViewProvider.currentPanel) {
      BaselineDetailViewProvider.currentPanel.reveal(column);
      BaselineDetailViewProvider.updateContent(finding, target, assets, geminiProvider);
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      'baselineDetail',
      `Baseline Issue: ${finding.feature.name}`,
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "media")],
        retainContextWhenHidden: true
      }
    );

    BaselineDetailViewProvider.currentPanel = panel;
    BaselineDetailViewProvider.currentFinding = finding;

    // Set the webview's initial html content
    BaselineDetailViewProvider.updateContent(finding, target, assets, geminiProvider);

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'openFile':
            await BaselineDetailViewProvider.openFile(message.uri, message.start, message.end);
            break;
          case 'openDocs':
            if (message.url) {
              await vscode.env.openExternal(vscode.Uri.parse(message.url));
            }
            break;
          case 'askGemini':
            await vscode.commands.executeCommand("baseline-gate.askGemini", {
              issue: message.issue,
              feature: message.feature,
              findingId: message.findingId,
              context: "detail"
            });
            break;
          case 'askGeminiFollowUp':
            try {
              // Show loading state
              await BaselineDetailViewProvider.sendLoadingState(panel.webview);
              
              await vscode.commands.executeCommand("baseline-gate.askGeminiFollowUp", {
                question: message.question,
                findingId: message.findingId,
                feature: message.feature,
                filePath: message.filePath,
                target: message.target
              });
            } catch (error) {
              // Send error state to webview
              await BaselineDetailViewProvider.sendErrorState(panel.webview, error instanceof Error ? error.message : 'Unknown error');
            }
            break;
          case 'copyCodeSnippet':
            await vscode.env.clipboard.writeText(message.code);
            await vscode.window.showInformationMessage('Code copied to clipboard');
            break;
          case 'refresh':
            if (BaselineDetailViewProvider.currentFinding) {
              BaselineDetailViewProvider.updateContent(
                BaselineDetailViewProvider.currentFinding,
                target,
                assets,
                geminiProvider
              );
            }
            break;
        }
      },
      undefined,
      context.subscriptions
    );

    // When the panel is disposed, reset the current panel
    panel.onDidDispose(() => {
      BaselineDetailViewProvider.currentPanel = undefined;
      BaselineDetailViewProvider.currentFinding = undefined;
    }, null, context.subscriptions);

    // Update panel title when content changes
    panel.onDidChangeViewState(() => {
      if (panel.visible && BaselineDetailViewProvider.currentFinding) {
        panel.title = `Baseline Issue: ${BaselineDetailViewProvider.currentFinding.feature.name}`;
      }
    });
  }

  public static createOrShowFileDetails(
    context: vscode.ExtensionContext,
    findings: BaselineFinding[],
    target: Target,
    assets: BaselineAnalysisAssets,
    geminiProvider?: import('../gemini/geminiViewProvider').GeminiViewProvider
  ): void {
    if (!findings.length) {
      return;
    }

    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    const relativePath = vscode.workspace.asRelativePath(findings[0].uri, false);

    // If we already have a panel, show it and update content
    if (BaselineDetailViewProvider.currentPanel) {
      BaselineDetailViewProvider.currentPanel.reveal(column);
      BaselineDetailViewProvider.updateFileContent(findings, target, assets, geminiProvider);
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      'baselineFileDetail',
      `Baseline Issues: ${relativePath}`,
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "media")],
        retainContextWhenHidden: true
      }
    );

    BaselineDetailViewProvider.currentPanel = panel;
    BaselineDetailViewProvider.currentFinding = findings[0]; // Store first finding for compatibility

    // Set the webview's initial html content
    BaselineDetailViewProvider.updateFileContent(findings, target, assets, geminiProvider);

    // Handle messages from the webview (reuse existing handler)
    panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'openFile':
            await BaselineDetailViewProvider.openFile(message.uri, message.start, message.end);
            break;
          case 'refresh':
            BaselineDetailViewProvider.updateFileContent(findings, target, assets, geminiProvider);
            break;
          // Handle other message types as needed
        }
      },
      undefined,
      context.subscriptions
    );

    // When the panel is disposed, reset the current panel
    panel.onDidDispose(() => {
      BaselineDetailViewProvider.currentPanel = undefined;
      BaselineDetailViewProvider.currentFinding = undefined;
    }, null, context.subscriptions);

    // Update panel title when content changes
    panel.onDidChangeViewState(() => {
      if (panel.visible && findings.length > 0) {
        const relativePath = vscode.workspace.asRelativePath(findings[0].uri, false);
        panel.title = `Baseline Issues: ${relativePath}`;
      }
    });
  }

  private static updateContent(
    finding: BaselineFinding,
    target: Target,
    assets: BaselineAnalysisAssets,
    geminiProvider?: import('../gemini/geminiViewProvider').GeminiViewProvider
  ): void {
    if (!BaselineDetailViewProvider.currentPanel) {
      return;
    }

    BaselineDetailViewProvider.currentFinding = finding;
    
    // Update panel title
    BaselineDetailViewProvider.currentPanel.title = `Baseline Issue: ${finding.feature.name}`;

    // Get Gemini context if available
    let geminiContext: GeminiSupportContext | undefined;
    if (geminiProvider) {
      const suggestions = geminiProvider.getSuggestionsForFinding(finding.id);
      geminiContext = {
        hasExistingSuggestion: suggestions.length > 0,
        suggestions: suggestions
      };
    }

    // Build severity icon URIs
    const severityIconUris: Record<Verdict, string> = {
      blocked: BaselineDetailViewProvider.currentPanel.webview.asWebviewUri(assets.statusIcons.blocked).toString(),
      warning: BaselineDetailViewProvider.currentPanel.webview.asWebviewUri(assets.statusIcons.warning).toString(),
      safe: BaselineDetailViewProvider.currentPanel.webview.asWebviewUri(assets.statusIcons.safe).toString(),
    };

    // Generate the detail HTML
    const detailHtml = buildIssueDetailHtml({
      finding,
      severityIconUris,
      target,
      assets,
      webview: BaselineDetailViewProvider.currentPanel.webview,
      gemini: geminiContext
    });

    // Create the full page HTML
    const html = BaselineDetailViewProvider.getWebviewContent(
      BaselineDetailViewProvider.currentPanel.webview,
      detailHtml,
      finding,
      target,
      geminiContext
    );

    BaselineDetailViewProvider.currentPanel.webview.html = html;
  }

  private static updateFileContent(
    findings: BaselineFinding[],
    target: Target,
    assets: BaselineAnalysisAssets,
    geminiProvider?: import('../gemini/geminiViewProvider').GeminiViewProvider
  ): void {
    if (!BaselineDetailViewProvider.currentPanel || !findings.length) {
      return;
    }

    const relativePath = vscode.workspace.asRelativePath(findings[0].uri, false);
    
    // Update panel title
    BaselineDetailViewProvider.currentPanel.title = `Baseline Issues: ${relativePath}`;

    // Build severity icon URIs
    const severityIconUris: Record<Verdict, string> = {
      blocked: BaselineDetailViewProvider.currentPanel.webview.asWebviewUri(assets.statusIcons.blocked).toString(),
      warning: BaselineDetailViewProvider.currentPanel.webview.asWebviewUri(assets.statusIcons.warning).toString(),
      safe: BaselineDetailViewProvider.currentPanel.webview.asWebviewUri(assets.statusIcons.safe).toString(),
    };

    // Generate the file detail HTML
    const detailHtml = buildFileDetailHtml(findings, severityIconUris, {
      target,
      assets,
      webview: BaselineDetailViewProvider.currentPanel.webview,
      getGeminiContext: (finding) => {
        if (geminiProvider) {
          const suggestions = geminiProvider.getSuggestionsForFinding(finding.id);
          return {
            hasExistingSuggestion: suggestions.length > 0,
            suggestions: suggestions
          };
        }
        return undefined;
      }
    });

    // Create the full page HTML for file details
    const html = BaselineDetailViewProvider.getWebviewContent(
      BaselineDetailViewProvider.currentPanel.webview,
      detailHtml,
      findings[0], // Use first finding for basic info
      target,
      undefined // No specific Gemini context for file view
    );

    BaselineDetailViewProvider.currentPanel.webview.html = html;
  }

  private static renderExistingChatMessages(suggestions: GeminiSuggestion[]): string {
    if (suggestions.length === 0) {
      return '';
    }

    const initialSuggestion = suggestions[0];
    const followUpSuggestions = suggestions.slice(1);

    let allMessages = `
      <div class="chat-message user-message">
        <div class="message-avatar">
          <div class="avatar-icon">👤</div>
        </div>
        <div class="message-content">
          <div class="message-text">${BaselineDetailViewProvider.escapeHtml(initialSuggestion.issue)}</div>
          <div class="message-time">${initialSuggestion.timestamp.toLocaleString()}</div>
        </div>
      </div>
      
      <div class="chat-message ai-message">
        <div class="message-avatar">
          <div class="avatar-icon">✨</div>
        </div>
        <div class="message-content">
          <div class="message-text">${BaselineDetailViewProvider.renderSimpleMarkdown(initialSuggestion.suggestion)}</div>
          <div class="message-time">${initialSuggestion.timestamp.toLocaleString()}</div>
        </div>
      </div>
    `;

    followUpSuggestions.forEach((suggestion) => {
      const isFollowUp = suggestion.issue.includes('Follow-up question about') || suggestion.issue.includes('Context: This is a follow-up');
      if (isFollowUp) {
        const questionMatch = suggestion.issue.match(/Follow-up question about.*?: (.+?)(?:\n\nContext:|$)/s);
        const actualQuestion = questionMatch ? questionMatch[1].trim() : suggestion.issue;
        
        allMessages += `
          <div class="chat-message user-message">
            <div class="message-avatar">
              <div class="avatar-icon">👤</div>
            </div>
            <div class="message-content">
              <div class="message-text">${BaselineDetailViewProvider.escapeHtml(actualQuestion)}</div>
              <div class="message-time">${suggestion.timestamp.toLocaleString()}</div>
            </div>
          </div>
          
          <div class="chat-message ai-message">
            <div class="message-avatar">
              <div class="avatar-icon">✨</div>
            </div>
            <div class="message-content">
              <div class="message-text">${BaselineDetailViewProvider.renderSimpleMarkdown(suggestion.suggestion)}</div>
              <div class="message-time">${suggestion.timestamp.toLocaleString()}</div>
            </div>
          </div>
        `;
      }
    });

    return allMessages;
  }

  private static escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private static renderSimpleMarkdown(text: string): string {
    // Handle code blocks with copy functionality
    let formattedText = text.replace(/```([\s\S]*?)```/g, (match, codeContent) => {
      const trimmedCode = codeContent.trim();
      const codeId = 'code-' + Math.random().toString(36).substr(2, 9);
      return `<div class="code-block-container">
        <div class="code-block-header">
          <span class="code-block-lang">Code</span>
          <button class="code-copy-button" data-code-id="${codeId}" title="Copy code">
            <svg class="copy-icon" viewBox="0 0 24 24" width="14" height="14">
              <path fill="currentColor" d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/>
            </svg>
          </button>
        </div>
        <pre class="code-block"><code id="${codeId}">${BaselineDetailViewProvider.escapeHtml(trimmedCode)}</code></pre>
      </div>`;
    });

    // Handle inline code
    formattedText = formattedText.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    
    // Handle bold text
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Handle italic text
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Handle line breaks
    formattedText = formattedText.replace(/\n/g, '<br>');
    
    return formattedText;
  }

  private static getWebviewContent(
    webview: vscode.Webview,
    detailHtml: string,
    finding: BaselineFinding,
    target: Target,
    geminiContext?: GeminiSupportContext
  ): string {
    const nonce = getNonce();
    const relativePath = vscode.workspace.asRelativePath(finding.uri, false);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Baseline Issue: ${finding.feature.name}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 0;
            line-height: 1.6;
        }

        .detail-view-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 24px;
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
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .detail-view-button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
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

        .file-breadcrumb a {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
        }

        .file-breadcrumb a:hover {
            text-decoration: underline;
        }

        /* Import existing detail styles */
        .detail-block {
            background: var(--vscode-editor-background);
            border: none;
            border-radius: 8px;
            margin: 0;
            box-shadow: none;
        }

        .detail-header-block {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 24px;
            padding: 20px;
            background: var(--vscode-textCodeBlock-background);
            border-radius: 8px;
            border: 1px solid var(--vscode-widget-border);
        }

        .detail-icon {
            width: 20px;
            height: 20px;
            flex-shrink: 0;
            margin-top: 2px;
        }

        .detail-title {
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 4px 0;
        }

        .detail-meta {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .detail-section {
            margin-bottom: 24px;
            padding: 20px;
            background: var(--vscode-textCodeBlock-background);
            border-radius: 8px;
            border: 1px solid var(--vscode-widget-border);
        }

        .detail-section h4 {
            margin: 0 0 12px 0;
            font-size: 16px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .detail-actions {
            background: transparent;
            border: none;
            padding: 0;
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        .detail-gemini-button,
        .detail-doc-link {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            padding: 12px 20px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
            text-decoration: none;
        }

        .detail-gemini-button:hover,
        .detail-doc-link:hover {
            background: var(--vscode-button-hoverBackground);
            transform: translateY(-1px);
        }

        .detail-doc-link {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .detail-doc-link:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .gemini-icon {
            font-size: 16px;
        }

        /* ChatGPT-like Chat Interface Styles */
        .gemini-chat-section {
            border: 2px solid var(--vscode-widget-border);
            border-radius: 12px;
            background: var(--vscode-editor-background);
            margin-top: 16px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .chat-header {
            padding: 16px 20px;
            border-bottom: 1px solid var(--vscode-widget-border);
            background: var(--vscode-titleBar-activeBackground, var(--vscode-sideBar-background));
        }

        .chat-title {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .title-icon {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 6px;
            color: white;
        }

        .chat-title h4 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: var(--vscode-titleBar-activeForeground, var(--vscode-foreground));
        }

        /* Collapsible Context */
        .chat-context-section {
            border-bottom: 1px solid var(--vscode-widget-border);
        }

        .chat-context-toggle {
            width: 100%;
            background: transparent;
            color: var(--vscode-foreground);
            border: none;
            padding: 0;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        .context-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            font-size: 13px;
            font-weight: 500;
        }

        .chat-context-toggle:hover .context-header {
            background: var(--vscode-list-hoverBackground);
        }

        .context-icon {
            font-size: 14px;
        }

        .context-toggle-icon {
            margin-left: auto;
            transition: transform 0.2s ease;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }

        .chat-context-toggle[data-expanded="true"] .context-toggle-icon {
            transform: rotate(90deg);
        }

        .chat-context-details {
            padding: 16px 20px;
            background: var(--vscode-textCodeBlock-background);
        }

        .context-grid {
            display: grid;
            gap: 12px;
        }

        .context-item {
            display: flex;
            align-items: center;
            font-size: 13px;
        }

        .context-label {
            font-weight: 500;
            color: var(--vscode-foreground);
            min-width: 60px;
            margin-right: 12px;
        }

        .context-value {
            color: var(--vscode-descriptionForeground);
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 12px;
        }

        /* Conversation Area */
        .chat-conversation {
            display: flex;
            flex-direction: column;
            min-height: 200px;
            max-height: 600px;
        }

        .chat-messages-container {
            flex: 1;
            overflow-y: auto;
            padding: 0;
        }

        .chat-messages {
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        /* Message Styles */
        .chat-message {
            display: flex;
            gap: 12px;
            align-items: flex-start;
        }

        .message-avatar {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            margin-top: 2px;
        }

        .avatar-icon {
            font-size: 14px;
        }

        .user-message .message-avatar {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .ai-message .message-avatar {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .message-content {
            flex: 1;
            min-width: 0;
        }

        .message-text {
            background: transparent;
            padding: 0;
            border-radius: 0;
            font-size: 14px;
            line-height: 1.6;
            color: var(--vscode-foreground);
            word-wrap: break-word;
        }

        .message-text p {
            margin: 0 0 12px 0;
        }

        .message-text p:last-child {
            margin-bottom: 0;
        }

        .message-text strong {
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .message-text em {
            font-style: italic;
            color: var(--vscode-foreground);
        }

        .message-text .inline-code {
            background: var(--vscode-textCodeBlock-background);
            color: var(--vscode-textPreformat-foreground);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 13px;
            border: 1px solid var(--vscode-widget-border);
        }

        .message-text .code-block-container {
            margin: 12px 0;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid var(--vscode-widget-border);
            background: var(--vscode-textCodeBlock-background);
        }

        .code-block-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: var(--vscode-titleBar-activeBackground, var(--vscode-button-secondaryBackground));
            border-bottom: 1px solid var(--vscode-widget-border);
            font-size: 12px;
            font-weight: 500;
        }

        .code-block-lang {
            color: var(--vscode-descriptionForeground);
        }

        .code-copy-button {
            background: var(--vscode-button-secondaryBackground);
            border: 1px solid var(--vscode-widget-border);
            color: var(--vscode-button-secondaryForeground);
            cursor: pointer;
            padding: 6px 8px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            font-weight: 500;
            transition: all 0.2s ease;
            opacity: 0.8;
        }

        .code-copy-button:hover {
            background: var(--vscode-button-hoverBackground);
            color: var(--vscode-button-foreground);
            opacity: 1;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .code-copy-button:active {
            transform: translateY(0);
            box-shadow: none;
        }

        .copy-icon {
            width: 14px;
            height: 14px;
        }

        .code-block {
            margin: 0;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 13px;
            line-height: 1.4;
            padding: 12px;
            background: var(--vscode-textCodeBlock-background);
            color: var(--vscode-textPreformat-foreground);
            overflow-x: auto;
        }

        .code-block code {
            background: transparent;
            padding: 0;
            font-family: inherit;
            font-size: inherit;
            color: inherit;
        }

        /* Enhanced Markdown Formatting */
        .message-content h1,
        .message-content h2,
        .message-content h3,
        .message-content h4,
        .message-content h5,
        .message-content h6 {
            color: var(--vscode-foreground);
            font-weight: 600;
            margin: 16px 0 8px 0;
            line-height: 1.3;
        }

        .message-content h1 { font-size: 1.5em; border-bottom: 2px solid var(--vscode-widget-border); padding-bottom: 8px; }
        .message-content h2 { font-size: 1.3em; border-bottom: 1px solid var(--vscode-widget-border); padding-bottom: 4px; }
        .message-content h3 { font-size: 1.15em; }

        .message-content p {
            margin: 8px 0;
            line-height: 1.6;
        }

        .message-content ul,
        .message-content ol {
            padding-left: 20px;
            margin: 8px 0;
        }

        .message-content li {
            margin: 4px 0;
            line-height: 1.5;
        }

        .message-content blockquote {
            border-left: 4px solid var(--vscode-charts-blue);
            margin: 12px 0;
            padding: 8px 16px;
            background: var(--vscode-textCodeBlock-background);
            border-radius: 0 6px 6px 0;
            font-style: italic;
        }

        .message-content strong {
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .message-content em {
            font-style: italic;
            color: var(--vscode-descriptionForeground);
        }

        .message-content code:not(.code-block code) {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-widget-border);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
            color: var(--vscode-textPreformat-foreground);
        }

        .message-content table {
            border-collapse: collapse;
            width: 100%;
            margin: 12px 0;
            border: 1px solid var(--vscode-widget-border);
            border-radius: 6px;
            overflow: hidden;
        }

        .message-content th,
        .message-content td {
            border: 1px solid var(--vscode-widget-border);
            padding: 8px 12px;
            text-align: left;
        }

        .message-content th {
            background: var(--vscode-textCodeBlock-background);
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .message-content hr {
            border: none;
            border-top: 2px solid var(--vscode-widget-border);
            margin: 20px 0;
        }

        .message-time {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 6px;
            opacity: 0.8;
        }

        /* Resource Links Styles */
        .resource-links {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .resource-links li {
            margin: 8px 0;
        }

        .resource-link {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 6px;
            transition: all 0.2s ease;
            background: var(--vscode-button-secondaryBackground);
            border: 1px solid var(--vscode-widget-border);
            font-size: 14px;
        }

        .resource-link:hover {
            background: var(--vscode-button-secondaryHoverBackground);
            color: var(--vscode-textLink-activeForeground);
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .external-link::after {
            content: "↗";
            font-size: 12px;
            opacity: 0.7;
        }

        /* Typing Indicator */
        .typing-indicator {
            padding: 0 20px 16px;
        }

        .typing-dots {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 12px 16px;
            background: var(--vscode-textCodeBlock-background);
            border-radius: 16px;
            width: fit-content;
            border: 1px solid var(--vscode-widget-border);
        }

        .typing-dots span {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--vscode-charts-blue);
            animation: typing-pulse 1.5s ease-in-out infinite;
        }

        .typing-dots span:nth-child(1) { animation-delay: 0s; }
        .typing-dots span:nth-child(2) { animation-delay: 0.3s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.6s; }

        @keyframes typing-pulse {
            0%, 60%, 100% { 
                opacity: 0.3; 
                transform: scale(0.8);
                background: var(--vscode-descriptionForeground);
            }
            30% { 
                opacity: 1; 
                transform: scale(1.1);
                background: var(--vscode-charts-blue);
            }
        }

        /* Input Area */
        .chat-input-container {
            border-top: 2px solid var(--vscode-widget-border);
            padding: 16px 20px;
            background: var(--vscode-textCodeBlock-background);
        }

        .chat-input-wrapper {
            display: flex;
            align-items: flex-end;
            background: var(--vscode-input-background);
            border: 2px solid var(--vscode-input-border);
            border-radius: 16px;
            padding: 12px 16px;
            transition: all 0.2s ease;
            position: relative;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .chat-input-wrapper:focus-within {
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 0 0 2px var(--vscode-focusBorder), 0 4px 8px rgba(0, 0, 0, 0.1);
            transform: translateY(-1px);
        }

        .chat-input {
            flex: 1;
            background: transparent;
            border: none;
            outline: none;
            color: var(--vscode-input-foreground);
            font-family: var(--vscode-font-family);
            font-size: 14px;
            line-height: 1.5;
            resize: none;
            min-height: 20px;
            max-height: 120px;
            padding: 4px 0;
        }

        .chat-input::placeholder {
            color: var(--vscode-input-placeholderForeground);
        }

        .chat-send-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 8px;
            width: 32px;
            height: 32px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            flex-shrink: 0;
            margin-left: 8px;
        }

        .chat-send-button:hover:not(:disabled) {
            background: var(--vscode-button-hoverBackground);
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .chat-send-button:disabled {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: not-allowed;
            opacity: 0.5;
            transform: none;
            box-shadow: none;
        }

        .send-icon {
            width: 16px;
            height: 16px;
        }

        .chat-input-footer {
            margin-top: 8px;
            text-align: center;
        }

        .chat-input-footer small {
            color: var(--vscode-descriptionForeground);
            font-size: 11px;
        }

        /* Tabbed Interface Styles */
        .tab-container {
            margin-top: 24px;
        }

        .tab-headers {
            display: flex;
            border-bottom: 2px solid var(--vscode-widget-border);
            margin-bottom: 0;
            background: var(--vscode-sideBar-background);
            border-radius: 8px 8px 0 0;
            overflow: hidden;
        }

        .tab-header {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 12px 24px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
            border-bottom: 3px solid transparent;
            position: relative;
        }

        .tab-header:hover {
            background: var(--vscode-button-secondaryHoverBackground);
            transform: translateY(-1px);
        }

        .tab-header.active {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-bottom-color: var(--vscode-focusBorder);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .tab-content {
            background: var(--vscode-editor-background);
            border-radius: 0 0 8px 8px;
            min-height: 400px;
        }

        .tab-panel {
            display: none;
            padding: 24px;
            animation: fadeIn 0.3s ease-in-out;
        }

        .tab-panel.active {
            display: block;
        }

        .tab-panel#chat-tab {
            display: none;
            padding: 24px;
            height: calc(100vh - 250px); /* Account for header, tabs, and margins */
        }

        .tab-panel#chat-tab.active {
            display: flex;
            flex-direction: column;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Dedicated Chat Interface */
        .dedicated-chat-interface {
            max-width: 800px;
            margin: 0 auto;
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        .chat-welcome {
            text-align: center;
            padding: 32px 24px;
            background: var(--vscode-textCodeBlock-background);
            border-radius: 12px;
            margin-bottom: 24px;
            border: 1px solid var(--vscode-widget-border);
        }

        .welcome-icon {
            font-size: 48px;
            margin-bottom: 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .chat-welcome h3 {
            margin: 0 0 12px 0;
            font-size: 24px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .chat-welcome p {
            margin: 0;
            color: var(--vscode-descriptionForeground);
            font-size: 16px;
            line-height: 1.5;
        }

        /* Enhanced Chat Area for Dedicated Tab */
        .dedicated-chat-interface {
            display: flex;
            flex-direction: column;
            height: calc(100vh - 200px); /* Adjust based on header and tab heights */
        }

        .dedicated-chat-interface .chat-conversation {
            flex: 1;
            background: var(--vscode-textCodeBlock-background);
            border-radius: 12px;
            border: 2px solid var(--vscode-widget-border);
            margin-bottom: 16px;
            min-height: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .dedicated-chat-interface .chat-messages-container {
            flex: 1;
            overflow-y: auto;
            padding: 0;
        }

        .dedicated-chat-interface .chat-messages {
            padding: 20px;
            min-height: 100%;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .chat-action-area {
            padding: 16px 20px;
            text-align: center;
            border-top: 1px solid var(--vscode-widget-border);
            background: var(--vscode-editor-background);
        }

        /* Fixed Input Container */
        .tab-panel#chat-tab > .chat-input-container {
            background: var(--vscode-editor-background);
            border: 2px solid var(--vscode-widget-border);
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            margin-top: auto; /* Push to bottom */
            flex-shrink: 0; /* Don't shrink */
        }

        .empty-chat-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--vscode-descriptionForeground);
            text-align: center;
            padding: 40px 20px;
        }

        .empty-chat-state .empty-icon {
            font-size: 64px;
            margin-bottom: 16px;
            opacity: 0.5;
        }

        .empty-chat-state h4 {
            margin: 0 0 8px 0;
            font-size: 18px;
            font-weight: 500;
        }

        .empty-chat-state p {
            margin: 0;
            font-size: 14px;
            opacity: 0.8;
        }

        /* Tab indicator animations */
        .tab-header::after {
            content: '';
            position: absolute;
            bottom: -3px;
            left: 0;
            right: 0;
            height: 3px;
            background: var(--vscode-focusBorder);
            transform: scaleX(0);
            transition: transform 0.3s ease;
        }

        .tab-header.active::after {
            transform: scaleX(1);
        }

        /* Responsive design */
        @media (max-width: 768px) {
            .detail-view-container {
                padding: 16px;
            }

            .detail-view-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 16px;
            }

            .detail-section {
                padding: 16px;
            }

            .tab-headers {
                flex-direction: column;
            }

            .tab-header {
                padding: 16px;
                border-radius: 0;
                border-bottom: 1px solid var(--vscode-widget-border);
            }

            .tab-panel {
                padding: 16px;
            }

            .dedicated-chat-interface {
                padding: 0;
                height: calc(100vh - 180px); /* Adjust for mobile */
            }

            .chat-welcome {
                padding: 24px 16px;
            }

            .tab-panel#chat-tab {
                height: calc(100vh - 200px); /* Adjust for mobile */
            }
        }
    </style>
</head>
<body>
    <div class="detail-view-container">
        <div class="detail-view-header">
            <div class="detail-view-title">
                <h1>${finding.feature.name}</h1>
            </div>
            <div class="detail-view-actions">
                <button class="detail-view-button" data-action="open-file">
                    📝 Open in Editor
                </button>
                <button class="detail-view-button primary" data-action="refresh">
                    🔄 Refresh
                </button>
            </div>
        </div>
        
        <div class="file-breadcrumb">
            <a href="#" data-action="open-file">${relativePath}</a> · 
            line ${finding.range.start.line + 1}, 
            column ${finding.range.start.character + 1}
        </div>

        <!-- Tabbed Interface -->
        <div class="tab-container">
            <div class="tab-headers">
                <button class="tab-header active" data-tab="details">
                    📋 Details
                </button>
                <button class="tab-header" data-tab="chat">
                    💬 Chat with AI
                </button>
            </div>
            
            <div class="tab-content">
                <div class="tab-panel active" id="details-tab">
                    ${detailHtml}
                </div>
                
                <div class="tab-panel" id="chat-tab">
                    <div class="dedicated-chat-interface">
                        ${geminiContext?.suggestions && geminiContext.suggestions.length > 0 ? '' : `
                        <div class="chat-welcome">
                            <div class="welcome-icon">✨</div>
                            <h3>Chat with AI Assistant</h3>
                            <p>Ask questions about this baseline compatibility issue, get code suggestions, or explore alternatives.</p>
                        </div>
                        `}
                        
                        ${geminiContext?.suggestions && geminiContext.suggestions.length > 0 ? `
                        <!-- Context Info -->
                        <div class="chat-context-section">
                            <button class="chat-context-toggle" data-expanded="false">
                                <div class="context-header">
                                    <span class="context-icon">🎯</span> 
                                    <span class="context-title">Context</span>
                                    <span class="context-toggle-icon">▶</span>
                                </div>
                            </button>
                            <div class="chat-context-details" style="display: none;">
                                <div class="context-grid">
                                    <div class="context-item">
                                        <span class="context-label">Target:</span>
                                        <span class="context-value">${BaselineDetailViewProvider.escapeHtml(target)} baseline</span>
                                    </div>
                                    <div class="context-item">
                                        <span class="context-label">Feature:</span>
                                        <span class="context-value">${BaselineDetailViewProvider.escapeHtml(finding.feature.name)}</span>
                                    </div>
                                    <div class="context-item">
                                        <span class="context-label">File:</span>
                                        <span class="context-value">${BaselineDetailViewProvider.escapeHtml(relativePath)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        ` : ''}
                        
                        <div class="chat-conversation">
                            <div class="chat-messages-container">
                                <div class="chat-messages" id="dedicated-chat-messages">
                                    ${geminiContext?.suggestions && geminiContext.suggestions.length > 0 
                                        ? BaselineDetailViewProvider.renderExistingChatMessages(geminiContext.suggestions)
                                        : '<!-- Chat messages will be added here -->'
                                    }
                                </div>
                            </div>
                            
                            ${geminiContext?.suggestions && geminiContext.suggestions.length > 0 ? '' : `
                            <div class="chat-action-area">
                                <button class="detail-gemini-button" data-gemini-issue="Fix this baseline compatibility issue" data-feature-name="${BaselineDetailViewProvider.escapeHtml(finding.feature.name)}" data-file-path="${BaselineDetailViewProvider.escapeHtml(relativePath)}" data-finding-id="${BaselineDetailViewProvider.escapeHtml(finding.id)}" data-target="${BaselineDetailViewProvider.escapeHtml(target)}" data-has-existing="false">
                                    <span class="gemini-icon">✨</span> Fix with Gemini
                                </button>
                            </div>
                            `}
                        </div>
                    </div>
                    
                    <!-- Fixed Input Area Outside Content -->
                    <div class="chat-input-container">
                        <div class="chat-input-wrapper">
                            <textarea 
                                class="chat-input" 
                                placeholder="${geminiContext?.suggestions && geminiContext.suggestions.length > 0 ? 'Continue the conversation...' : 'Ask about this compatibility issue...'}"
                                data-finding-id="${finding.id}"
                                data-feature-name="${finding.feature.name}"
                                data-file-path="${relativePath}"
                                data-target="baseline"
                            ></textarea>
                            <button class="chat-send-button" disabled>
                                <svg class="send-icon" viewBox="0 0 24 24" width="16" height="16">
                                    <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                                </svg>
                            </button>
                        </div>
                        <div class="chat-input-footer">
                            <small>Press Enter to send, Shift+Enter for new line</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        // Tab switching functionality
        function switchTab(tabName) {
            // Update tab headers
            document.querySelectorAll('.tab-header').forEach(header => {
                header.classList.remove('active');
            });
            document.querySelector(\`[data-tab="\${tabName}"]\`).classList.add('active');
            
            // Update tab panels
            document.querySelectorAll('.tab-panel').forEach(panel => {
                panel.classList.remove('active');
            });
            document.getElementById(\`\${tabName}-tab\`).classList.add('active');
            
            // Initialize empty chat state if switching to chat tab
            if (tabName === 'chat') {
                initializeChatTab();
                
                // If there are existing messages, scroll to bottom
                setTimeout(() => {
                    const chatMessages = document.getElementById('dedicated-chat-messages');
                    if (chatMessages && chatMessages.children.length > 1) { // More than just empty state
                        scrollToBottom();
                    }
                }, 100);
            }
        }

        function initializeChatTab() {
            const chatMessages = document.getElementById('dedicated-chat-messages');
            if (chatMessages && chatMessages.children.length === 0 && !chatMessages.innerHTML.trim()) {
                chatMessages.innerHTML = \`
                    <div class="empty-chat-state">
                        <div class="empty-icon">💬</div>
                        <h4>Start a conversation</h4>
                        <p>Ask questions about this compatibility issue, get suggestions, or explore alternatives.</p>
                    </div>
                \`;
            }
            
            // Always scroll to bottom when initializing chat tab
            setTimeout(() => {
                scrollToBottom();
            }, 100);
        }

        // Handle clicks on buttons and links
        document.addEventListener('click', (event) => {
            // Handle tab switching
            const tabHeader = event.target.closest('.tab-header');
            if (tabHeader) {
                const tabName = tabHeader.getAttribute('data-tab');
                switchTab(tabName);
                return;
            }
            // Handle open file button
            const openFileButton = event.target.closest('[data-action="open-file"]');
            if (openFileButton) {
                vscode.postMessage({
                    type: 'openFile',
                    uri: '${finding.uri.toString()}',
                    start: { line: ${finding.range.start.line}, character: ${finding.range.start.character} },
                    end: { line: ${finding.range.end.line}, character: ${finding.range.end.character} }
                });
                return;
            }

            // Handle refresh button
            const refreshButton = event.target.closest('[data-action="refresh"]');
            if (refreshButton) {
                vscode.postMessage({ type: 'refresh' });
                return;
            }

            // Handle code copy buttons in chat interface
            const codeCopyButton = event.target.closest('.code-copy-button');
            if (codeCopyButton) {
                const codeId = codeCopyButton.getAttribute('data-code-id');
                const codeElement = document.getElementById(codeId);
                const codeText = codeElement ? codeElement.textContent || '' : '';
                navigator.clipboard.writeText(codeText).then(() => {
                    // Visual feedback
                    const originalContent = codeCopyButton.innerHTML;
                    codeCopyButton.innerHTML = '<span>✓</span>';
                    setTimeout(() => {
                        codeCopyButton.innerHTML = originalContent;
                    }, 2000);
                }).catch(() => {
                    // Fallback to VS Code message
                    vscode.postMessage({ type: 'copyCodeSnippet', code: codeText });
                });
                return;
            }

            // Handle context toggle
            const contextToggle = event.target.closest('.chat-context-toggle');
            if (contextToggle) {
                const isExpanded = contextToggle.getAttribute('data-expanded') === 'true';
                const contextDetails = contextToggle.parentElement.querySelector('.chat-context-details');
                const toggleIcon = contextToggle.querySelector('.context-toggle-icon');
                
                if (contextDetails && toggleIcon) {
                    if (isExpanded) {
                        contextDetails.style.display = 'none';
                        contextToggle.setAttribute('data-expanded', 'false');
                        toggleIcon.textContent = '▶';
                    } else {
                        contextDetails.style.display = 'block';
                        contextToggle.setAttribute('data-expanded', 'true');
                        toggleIcon.textContent = '▼';
                    }
                }
                return;
            }

            const copyCodeButton = event.target.closest('[data-action="copy-code"]');
            if (copyCodeButton) {
                const container = copyCodeButton.closest('[data-code-block]');
                const codeElement = container ? container.querySelector('code') : null;
                const codeText = codeElement ? codeElement.textContent || '' : '';
                vscode.postMessage({ type: 'copyCodeSnippet', code: codeText });
                return;
            }

            const docButton = event.target.closest('[data-doc-url]');
            if (docButton) {
                const url = docButton.getAttribute('data-doc-url');
                vscode.postMessage({ type: 'openDocs', url });
                return;
            }

            // Handle resource link clicks
            const resourceLink = event.target.closest('[data-command]');
            if (resourceLink) {
                const command = resourceLink.getAttribute('data-command');
                if (command?.startsWith('command:')) {
                    const commandName = command.replace('command:', '');
                    const [cmd, argsString] = commandName.split('?');
                    if (cmd === 'baseline-gate.openDocs' && argsString) {
                        try {
                            const args = JSON.parse(decodeURIComponent(argsString));
                            vscode.postMessage({ type: 'openDocs', url: args.id });
                        } catch (error) {
                            console.error('Failed to parse command args:', error);
                        }
                    }
                }
                return;
            }

            // Handle external resource links
            const externalLink = event.target.closest('.external-link');
            if (externalLink && externalLink.href) {
                vscode.postMessage({ type: 'openDocs', url: externalLink.href });
                return;
            }

            const geminiButton = event.target.closest('[data-gemini-issue]');
            if (geminiButton) {
                const issue = geminiButton.getAttribute('data-gemini-issue');
                const feature = geminiButton.getAttribute('data-feature-name');
                const filePath = geminiButton.getAttribute('data-file-path');
                const findingId = geminiButton.getAttribute('data-finding-id');
                const hasExisting = geminiButton.getAttribute('data-has-existing') === 'true';
                
                if (hasExisting) {
                    // Show chat interface for "Continue with Gemini"
                    const chatSection = document.querySelector('.gemini-chat-section');
                    if (chatSection) {
                        chatSection.style.display = chatSection.style.display === 'none' ? 'block' : 'none';
                    }
                } else {
                    // Regular "Fix with Gemini" behavior
                    vscode.postMessage({ type: 'askGemini', issue, feature, filePath, findingId });
                }
                return;
            }

            const chatSendButton = event.target.closest('.chat-send-button');
            if (chatSendButton && !chatSendButton.disabled && !isWaitingForResponse) {
                const chatInput = chatSendButton.parentElement.querySelector('.chat-input');
                const followUpQuestion = chatInput.value.trim();
                
                if (followUpQuestion) {
                    const findingId = chatInput.getAttribute('data-finding-id');
                    const feature = chatInput.getAttribute('data-feature-name');
                    const filePath = chatInput.getAttribute('data-file-path');
                    const target = chatInput.getAttribute('data-target');
                    
                    // Store the query in case we need to retry
                    lastFailedQuery = followUpQuestion;
                    
                    // Determine which chat container to use
                    const isDedicatedChat = chatInput.closest('#chat-tab') !== null;
                    const messagesContainer = isDedicatedChat 
                        ? document.getElementById('dedicated-chat-messages')
                        : document.querySelector('.chat-messages');
                    
                    // Clear empty state if it exists
                    if (isDedicatedChat) {
                        const emptyState = messagesContainer.querySelector('.empty-chat-state');
                        if (emptyState) {
                            emptyState.remove();
                        }
                    }
                    
                    // Add user message immediately
                    addUserMessage(followUpQuestion, messagesContainer);
                    
                    // Add loading message
                    addLoadingMessage(messagesContainer);
                    
                    // Clear the input and disable button
                    chatInput.value = '';
                    chatInput.style.height = 'auto';
                    chatSendButton.disabled = true;
                    isWaitingForResponse = true;
                    
                    vscode.postMessage({ 
                        type: 'askGeminiFollowUp', 
                        question: followUpQuestion,
                        findingId,
                        feature,
                        filePath,
                        target
                    });
                }
                return;
            }

            // Handle retry button click
            const retryButton = event.target.closest('.retry-query-button');
            if (retryButton && lastFailedQuery && !isWaitingForResponse) {
                // Find the correct chat input (could be in either tab)
                const activeTab = document.querySelector('.tab-panel.active');
                const chatInput = activeTab?.querySelector('.chat-input') || document.querySelector('.chat-input');
                
                const findingId = chatInput?.getAttribute('data-finding-id');
                const feature = chatInput?.getAttribute('data-feature-name');
                const filePath = chatInput?.getAttribute('data-file-path');
                const target = chatInput?.getAttribute('data-target');
                
                // Remove the error message and get its container
                const errorMessage = retryButton.closest('.chat-message');
                const messagesContainer = errorMessage?.parentElement;
                if (errorMessage) {
                    errorMessage.remove();
                }
                
                // Add loading message to the same container
                addLoadingMessage(messagesContainer);
                
                // Disable send buttons and set waiting state
                document.querySelectorAll('.chat-send-button').forEach(btn => {
                    btn.disabled = true;
                });
                isWaitingForResponse = true;
                
                vscode.postMessage({ 
                    type: 'askGeminiFollowUp', 
                    question: lastFailedQuery,
                    findingId,
                    feature,
                    filePath,
                    target
                });
                return;
            }
        });



        // Auto-resize textarea
        function autoResizeTextarea(textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        }

        // Handle chat input changes
        document.addEventListener('input', (event) => {
            if (event.target.classList.contains('chat-input')) {
                const input = event.target;
                const sendButton = input.parentElement.querySelector('.chat-send-button');
                const hasText = input.value.trim().length > 0;
                // Only disable if waiting for response, otherwise enable based on text
                sendButton.disabled = isWaitingForResponse || !hasText;
                autoResizeTextarea(input);
            }
        });

        // Initialize the interface
        document.addEventListener('DOMContentLoaded', () => {
            initializeChatTab();
            
            // If there are existing messages, scroll to bottom after a short delay
            setTimeout(() => {
                const chatMessages = document.getElementById('dedicated-chat-messages');
                if (chatMessages && chatMessages.children.length > 0) {
                    scrollToBottom();
                }
            }, 200);
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.target.classList.contains('chat-input')) {
                if (event.key === 'Enter' && !event.shiftKey) {
                    // Enter sends message
                    event.preventDefault();
                    const sendButton = event.target.parentElement.querySelector('.chat-send-button');
                    if (!sendButton.disabled) {
                        sendButton.click();
                    }
                } else if (event.key === 'Enter' && event.shiftKey) {
                    // Shift+Enter adds new line (default behavior)
                    return;
                }
            }
        });

        // Add new message to chat
        function addUserMessage(text, container = null) {
            const messagesContainer = container || document.querySelector('.chat-messages') || document.getElementById('dedicated-chat-messages');
            const userMessage = document.createElement('div');
            userMessage.className = 'chat-message user-message';
            userMessage.innerHTML = \`
                <div class="message-avatar">
                    <div class="avatar-icon">👤</div>
                </div>
                <div class="message-content">
                    <div class="message-text">\${escapeHtml(text)}</div>
                    <div class="message-time">Just now</div>
                </div>
            \`;
            messagesContainer.appendChild(userMessage);
            scrollToBottom(messagesContainer);
        }

        function addLoadingMessage(container = null) {
            const messagesContainer = container || document.querySelector('.chat-messages') || document.getElementById('dedicated-chat-messages');
            const loadingMessage = document.createElement('div');
            loadingMessage.className = 'chat-message ai-message';
            loadingMessage.id = 'loading-message';
            loadingMessage.innerHTML = \`
                <div class="message-avatar">
                    <div class="avatar-icon">✨</div>
                </div>
                <div class="message-content">
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            \`;
            messagesContainer.appendChild(loadingMessage);
            scrollToBottom(messagesContainer);
        }

        function replaceLoadingWithResponse(responseText) {
            const loadingMessage = document.getElementById('loading-message');
            if (loadingMessage) {
                const messagesContainer = loadingMessage.parentElement;
                loadingMessage.remove();
                
                const responseMessage = document.createElement('div');
                responseMessage.className = 'chat-message ai-message';
                responseMessage.innerHTML = \`
                    <div class="message-avatar">
                        <div class="avatar-icon">✨</div>
                    </div>
                    <div class="message-content">
                        <div class="message-text">\${formatMarkdownResponse(responseText)}</div>
                        <div class="message-time">Just now</div>
                    </div>
                \`;
                messagesContainer.appendChild(responseMessage);
                scrollToBottom(messagesContainer);
            }
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function scrollToBottom(messagesContainer = null) {
            const container = messagesContainer?.closest('.chat-messages-container') || 
                           document.querySelector('#chat-tab .chat-messages-container') ||
                           document.querySelector('.chat-messages-container');
            if (container) {
                container.scrollTop = container.scrollHeight;
                // Also ensure the container is visible and has proper height
                requestAnimationFrame(() => {
                    container.scrollTop = container.scrollHeight;
                });
            }
        }

        function formatMarkdownResponse(text) {
            // Handle code blocks with copy functionality
            let formattedText = text.replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, (match, codeContent) => {
                const trimmedCode = codeContent.trim();
                const codeId = 'code-' + Math.random().toString(36).substr(2, 9);
                return \`<div class="code-block-container">
                    <div class="code-block-header">
                        <span class="code-block-lang">Code</span>
                        <button class="code-copy-button" data-code-id="\${codeId}" title="Copy code">
                            <svg class="copy-icon" viewBox="0 0 24 24" width="14" height="14">
                                <path fill="currentColor" d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/>
                            </svg>
                        </button>
                    </div>
                    <pre class="code-block"><code id="\${codeId}">\${escapeHtml(trimmedCode)}</code></pre>
                </div>\`;
            });

            // Handle inline code
            formattedText = formattedText.replace(/\`([^\`]+)\`/g, '<code class="inline-code">$1</code>');
            
            // Handle bold text
            formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            
            // Handle italic text
            formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
            
            // Handle line breaks
            formattedText = formattedText.replace(/\\n/g, '<br>');
            
            return formattedText;
        }

        // Store original chat send handler
        let isWaitingForResponse = false;
        let lastFailedQuery = '';

        // Listen for Gemini responses
        window.addEventListener('message', (event) => {
            const message = event.data;
            if (message.type === 'geminiResponse') {
                switch (message.state) {
                    case 'success':
                        replaceLoadingWithResponse(message.response);
                        isWaitingForResponse = false;
                        // Re-enable all send buttons and inputs
                        document.querySelectorAll('.chat-input').forEach(input => {
                            const sendButton = input.parentElement.querySelector('.chat-send-button');
                            if (sendButton) {
                                sendButton.disabled = input.value.trim().length === 0;
                            }
                            input.disabled = false;
                        });
                        break;
                    case 'error':
                        replaceLoadingWithResponse(\`
                            <div style="color: var(--vscode-errorForeground); padding: 12px; background: var(--vscode-inputValidation-errorBackground); border: 1px solid var(--vscode-inputValidation-errorBorder); border-radius: 6px; margin: 8px 0;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                    <span style="font-size: 16px;">❌</span>
                                    <strong>Failed to get response</strong>
                                </div>
                                <div style="margin-bottom: 12px; font-size: 13px;">
                                    \${message.error}
                                </div>
                                <button class="retry-query-button" style="background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 6px;">
                                    <span>🔄</span> Retry
                                </button>
                            </div>
                        \`);
                        
                        // Reset the waiting state and re-enable input
                        isWaitingForResponse = false;
                        // Keep lastFailedQuery for retry functionality, don't clear it
                        
                        // Re-enable all send buttons and inputs
                        document.querySelectorAll('.chat-input').forEach(input => {
                            const sendButton = input.parentElement.querySelector('.chat-send-button');
                            if (sendButton) {
                                sendButton.disabled = false; // Always enable so user can type new messages
                            }
                            input.disabled = false;
                            input.placeholder = input.placeholder || 'Type your message...';
                        });
                        break;
                }
            }
        });
    </script>
</body>
</html>`;
  }

  private static async openFile(
    uri: string,
    start: { line: number; character: number },
    end: { line: number; character: number }
  ): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(uri));
      const editor = await vscode.window.showTextDocument(document);
      
      const startPos = new vscode.Position(start.line, start.character);
      const endPos = new vscode.Position(end.line, end.character);
      const range = new vscode.Range(startPos, endPos);
      
      editor.selection = new vscode.Selection(startPos, endPos);
      editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    } catch (error) {
      console.error('Error opening file:', error);
      await vscode.window.showErrorMessage('Failed to open file');
    }
  }

  public static updateCurrentPanel(
    finding: BaselineFinding,
    target: Target,
    assets: BaselineAnalysisAssets,
    geminiProvider?: import('../gemini/geminiViewProvider').GeminiViewProvider
  ): void {
    if (BaselineDetailViewProvider.currentPanel) {
      BaselineDetailViewProvider.updateContent(finding, target, assets, geminiProvider);
    }
  }

  public static getCurrentPanel(): vscode.WebviewPanel | undefined {
    return BaselineDetailViewProvider.currentPanel;
  }

  public static async sendLoadingState(webview: vscode.Webview): Promise<void> {
    await webview.postMessage({
      type: 'geminiResponse',
      state: 'loading'
    });
  }

  public static async sendErrorState(webview: vscode.Webview, error: string): Promise<void> {
    await webview.postMessage({
      type: 'geminiResponse',
      state: 'error',
      error: error
    });
  }

  public static async sendSuccessState(webview: vscode.Webview, response: string): Promise<void> {
    await webview.postMessage({
      type: 'geminiResponse',
      state: 'success',
      response: response
    });
  }

  public static dispose(): void {
    BaselineDetailViewProvider.currentPanel?.dispose();
    BaselineDetailViewProvider.currentPanel = undefined;
    BaselineDetailViewProvider.currentFinding = undefined;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}