import * as vscode from "vscode";
import type { BaselineFinding } from "./workspaceScanner";
import type { Target } from "../core/targets";
import type { BaselineAnalysisAssets } from "./analysis/types";
import type { GeminiSupportContext } from "./analysis/html";
import { buildIssueDetailHtml } from "./analysis/html";
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
      finding
    );

    BaselineDetailViewProvider.currentPanel.webview.html = html;
  }

  private static getWebviewContent(
    webview: vscode.Webview,
    detailHtml: string,
    finding: BaselineFinding
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
            border: 1px solid var(--vscode-widget-border);
            border-radius: 8px;
            background: var(--vscode-editor-background);
            margin-top: 16px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
            background: transparent;
            border: none;
            color: var(--vscode-descriptionForeground);
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            transition: all 0.2s;
        }

        .code-copy-button:hover {
            background: var(--vscode-list-hoverBackground);
            color: var(--vscode-foreground);
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

        .message-time {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 6px;
            opacity: 0.8;
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
        }

        .typing-dots span {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--vscode-descriptionForeground);
            animation: typing-pulse 1.5s ease-in-out infinite;
        }

        .typing-dots span:nth-child(1) { animation-delay: 0s; }
        .typing-dots span:nth-child(2) { animation-delay: 0.3s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.6s; }

        @keyframes typing-pulse {
            0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
            30% { opacity: 1; transform: scale(1); }
        }

        /* Input Area */
        .chat-input-container {
            border-top: 1px solid var(--vscode-widget-border);
            padding: 16px 20px;
            background: var(--vscode-editor-background);
        }

        .chat-input-wrapper {
            display: flex;
            align-items: flex-end;
            background: var(--vscode-input-background);
            border: 2px solid var(--vscode-input-border);
            border-radius: 12px;
            padding: 8px 12px;
            transition: border-color 0.2s ease;
            position: relative;
        }

        .chat-input-wrapper:focus-within {
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 0 0 1px var(--vscode-focusBorder);
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
                <button class="detail-view-button" onclick="openInEditor()">
                    📝 Open in Editor
                </button>
                <button class="detail-view-button primary" onclick="refreshContent()">
                    🔄 Refresh
                </button>
            </div>
        </div>
        
        <div class="file-breadcrumb">
            <a href="#" onclick="openInEditor()">${relativePath}</a> · 
            line ${finding.range.start.line + 1}, 
            column ${finding.range.start.character + 1}
        </div>

        ${detailHtml}
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        function openInEditor() {
            vscode.postMessage({
                type: 'openFile',
                uri: '${finding.uri.toString()}',
                start: { line: ${finding.range.start.line}, character: ${finding.range.start.character} },
                end: { line: ${finding.range.end.line}, character: ${finding.range.end.character} }
            });
        }

        function refreshContent() {
            vscode.postMessage({ type: 'refresh' });
        }

        // Handle clicks on buttons and links
        document.addEventListener('click', (event) => {
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
                
                if (contextDetails) {
                    contextToggle.setAttribute('data-expanded', !isExpanded);
                    contextDetails.style.display = isExpanded ? 'none' : 'block';
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
                    
                    // Add user message immediately
                    addUserMessage(followUpQuestion);
                    
                    // Add loading message
                    addLoadingMessage();
                    
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
        });

        // Context toggle functionality
        document.addEventListener('click', (event) => {
            if (event.target.closest('.chat-context-toggle')) {
                const toggle = event.target.closest('.chat-context-toggle');
                const details = toggle.parentElement.querySelector('.chat-context-details');
                const toggleIcon = toggle.querySelector('.context-toggle-icon');
                const isExpanded = toggle.getAttribute('data-expanded') === 'true';
                
                if (isExpanded) {
                    details.style.display = 'none';
                    toggle.setAttribute('data-expanded', 'false');
                    toggleIcon.textContent = '▶';
                } else {
                    details.style.display = 'block';
                    toggle.setAttribute('data-expanded', 'true');
                    toggleIcon.textContent = '▼';
                }
            }

            if (event.target.closest('.show-all-messages')) {
                const chatMessages = document.querySelector('.chat-messages');
                const historyMessages = document.querySelector('.chat-history-messages');
                const showAllButton = event.target.closest('.show-all-messages');
                
                if (historyMessages.style.display === 'none') {
                    chatMessages.style.display = 'none';
                    historyMessages.style.display = 'block';
                    showAllButton.textContent = 'Show recent only';
                } else {
                    chatMessages.style.display = 'block';
                    historyMessages.style.display = 'none';
                    showAllButton.textContent = 'Show all messages';
                }
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
                sendButton.disabled = !hasText;
                autoResizeTextarea(input);
            }
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
        function addUserMessage(text) {
            const messagesContainer = document.querySelector('.chat-messages');
            const userMessage = document.createElement('div');
            userMessage.className = 'chat-message user-message';
            userMessage.innerHTML = \`
                <div class="message-avatar">👤</div>
                <div class="message-content">
                    <div class="message-text">\${escapeHtml(text)}</div>
                    <div class="message-time">Just now</div>
                </div>
            \`;
            messagesContainer.appendChild(userMessage);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function addLoadingMessage() {
            const messagesContainer = document.querySelector('.chat-messages');
            const loadingMessage = document.createElement('div');
            loadingMessage.className = 'loading-message';
            loadingMessage.id = 'loading-message';
            loadingMessage.innerHTML = \`
                <div class="message-avatar">✨</div>
                <div class="message-content">
                    <div class="message-text">
                        <span>Thinking</span>
                        <div class="loading-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>
            \`;
            messagesContainer.appendChild(loadingMessage);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function replaceLoadingWithResponse(responseText) {
            const loadingMessage = document.getElementById('loading-message');
            if (loadingMessage) {
                loadingMessage.remove();
            }
            
            const messagesContainer = document.querySelector('.chat-messages');
            const responseMessage = document.createElement('div');
            responseMessage.className = 'chat-message gemini-message';
            responseMessage.innerHTML = \`
                <div class="message-avatar">✨</div>
                <div class="message-content">
                    <div class="message-text">\${responseText}</div>
                    <div class="message-time">Just now</div>
                </div>
            \`;
            messagesContainer.appendChild(responseMessage);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Store original chat send handler
        let isWaitingForResponse = false;

        // Listen for Gemini responses
        window.addEventListener('message', (event) => {
            const message = event.data;
            if (message.type === 'geminiResponse') {
                switch (message.state) {
                    case 'success':
                        replaceLoadingWithResponse(message.response);
                        isWaitingForResponse = false;
                        // Re-enable send button if there's text
                        const chatInput = document.querySelector('.chat-input');
                        const sendButton = document.querySelector('.chat-send-button');
                        if (chatInput && sendButton) {
                            sendButton.disabled = chatInput.value.trim().length === 0;
                        }
                        break;
                    case 'error':
                        replaceLoadingWithResponse(\`<div style="color: var(--vscode-errorForeground);">❌ Error: \${message.error}</div>\`);
                        isWaitingForResponse = false;
                        // Re-enable send button if there's text
                        const errorChatInput = document.querySelector('.chat-input');
                        const errorSendButton = document.querySelector('.chat-send-button');
                        if (errorChatInput && errorSendButton) {
                            errorSendButton.disabled = errorChatInput.value.trim().length === 0;
                        }
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